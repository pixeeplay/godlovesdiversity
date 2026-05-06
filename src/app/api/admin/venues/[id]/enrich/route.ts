import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enrichVenue } from '@/lib/venue-enrich';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/venues/[id]/enrich?dry=1
 *
 * Lance l'enrichissement IA d'un venue : Gemini grounded search → patch des champs
 * vides ou complétion intelligente. Si ?dry=1, ne sauvegarde pas (preview).
 *
 * Body optionnel : { overwrite: boolean }  // si true, écrase TOUTES les données existantes
 *                                           // par défaut : ne complète QUE les champs vides
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s?.user || !['ADMIN', 'EDITOR'].includes((s.user as any).role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const body = await req.json().catch(() => ({}));
  const overwrite = !!body.overwrite;

  const venue = await prisma.venue.findUnique({ where: { id: ctx.params.id } });
  if (!venue) return NextResponse.json({ error: 'venue-not-found' }, { status: 404 });

  const result = await enrichVenue({
    name: venue.name,
    city: venue.city,
    address: venue.address,
    country: venue.country,
    type: venue.type,
    existing: {
      phone: venue.phone,
      email: venue.email,
      website: venue.website,
      facebook: venue.facebook,
      instagram: venue.instagram
    }
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.error,
      notes: result.notes,
      sources: result.sources
    }, { status: 500 });
  }

  // Calcule le diff : ce qui sera réellement appliqué
  const finalPatch: any = {};
  const existing = venue as any;
  for (const [k, v] of Object.entries(result.patch)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (overwrite || !existing[k] || (Array.isArray(existing[k]) && existing[k].length === 0)) {
      finalPatch[k] = v;
    }
  }

  if (!dry && Object.keys(finalPatch).length > 0) {
    finalPatch.enrichedAt = new Date();
    finalPatch.enrichmentConfidence = result.confidence;
    finalPatch.enrichmentSources = result.sources;
    finalPatch.enrichmentNotes = result.notes;
    await prisma.venue.update({ where: { id: venue.id }, data: finalPatch });
  } else if (!dry) {
    // Aucun champ à patcher mais on note quand même qu'on a tenté
    await prisma.venue.update({
      where: { id: venue.id },
      data: {
        enrichedAt: new Date(),
        enrichmentConfidence: result.confidence,
        enrichmentSources: result.sources,
        enrichmentNotes: result.notes + ' (aucun champ à modifier)'
      }
    });
  }

  return NextResponse.json({
    ok: true,
    dry,
    venue: { id: venue.id, name: venue.name },
    confidence: result.confidence,
    fieldsApplied: Object.keys(finalPatch).filter((k) => !k.startsWith('enrichment') && k !== 'enrichedAt'),
    fieldsSuggested: Object.keys(result.patch),
    sources: result.sources,
    notes: result.notes,
    patch: finalPatch
  });
}
