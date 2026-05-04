import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scrapeUrlMetadata } from '@/lib/og-scraper';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pro/events/import-url
 * Body: { url, venueId? }
 *
 * Scrape l'URL (event Facebook, Eventbrite, Meetup, etc.) via OpenGraph + JSON-LD
 * et crée un event en BROUILLON dans GLD lié au venue (optionnel).
 *
 * Utilisé par :
 * - Le bookmarklet "Envoyer à GLD"
 * - Le formulaire manuel dans /espace-pro/import
 * - L'endpoint email webhook (Option B) qui appelle ça après extraction de l'URL
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const userId = (s.user as any).id;

  try {
    const { url, venueId, autoPublish } = await req.json();
    if (!url) return NextResponse.json({ error: 'url requise' }, { status: 400 });

    // Si venueId fourni, vérif ownership
    if (venueId) {
      const ok = await prisma.venue.findFirst({ where: { id: venueId, ownerId: userId } });
      if (!ok) return NextResponse.json({ error: "ce lieu ne t'appartient pas" }, { status: 403 });
    }

    // Vérifie qu'on n'a pas déjà importé cette URL
    const existing = await prisma.event.findFirst({
      where: { OR: [{ externalUrl: url }, { url }] }
    }).catch(() => null);
    if (existing) {
      return NextResponse.json({ event: existing, alreadyImported: true });
    }

    // Scrape OG metadata
    const meta = await scrapeUrlMetadata(url);

    if (!meta.title) {
      return NextResponse.json({ error: 'impossible d\'extraire les infos depuis cette URL — vérifie qu\'elle est publique' }, { status: 400 });
    }
    if (!meta.startsAt) {
      return NextResponse.json({ error: 'aucune date trouvée — l\'event est peut-être privé. Ajoute-le manuellement.' }, { status: 400 });
    }

    // Extraction d'un ID externe stable pour idempotence
    let externalId: string | null = null;
    if (meta.detectedSource === 'facebook') {
      const m = url.match(/facebook\.com\/events\/(\d+)/);
      if (m) externalId = m[1];
    }

    const slug = `${meta.detectedSource}-${(meta.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Date.now().toString(36)}`;

    const event = await prisma.event.create({
      data: {
        slug,
        title: meta.title,
        description: meta.description || null,
        startsAt: new Date(meta.startsAt),
        endsAt: meta.endsAt ? new Date(meta.endsAt) : null,
        location: meta.location || null,
        city: meta.city || null,
        country: meta.country || null,
        coverImage: meta.image || null,
        url,
        tags: [meta.detectedSource],
        venueId: venueId || null,
        published: !!autoPublish, // par défaut brouillon (curation)
        externalSource: meta.detectedSource,
        externalId,
        externalUrl: url
      }
    });

    return NextResponse.json({ event, scraped: meta });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
