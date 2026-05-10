import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { importPageFromLive } from '@/lib/page-import-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/page-builder/verify?slug=foo
 *
 * Diagnostic complet pour vérifier que l'import marche pour un slug donné :
 *  1. Compte les blocs actuellement en DB pour ce slug
 *  2. Fetch la page live et fait un dryRun de l'import (ne sauve rien)
 *  3. Retourne un rapport détaillé : URL fetched ok / parsing extrait N blocs /
 *     types / connexion DB ok / etc.
 *
 * À utiliser pour debugger quand l'import "ne fait rien" comme attendu.
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug-required' }, { status: 400 });

  const checks: any[] = [];

  // 1. Connexion DB
  let dbCount = 0;
  try {
    dbCount = await (prisma as any).pageBlock.count({ where: { pageSlug: slug } });
    checks.push({ step: 'db-connection', ok: true, message: `${dbCount} blocs déjà en DB pour /${slug}` });
  } catch (e: any) {
    checks.push({ step: 'db-connection', ok: false, message: 'Prisma unavailable: ' + e?.message });
  }

  // 2. Fetch + dry-run import
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  const result = await importPageFromLive({
    slug, baseUrl, locale: 'fr', dryRun: true, effectIntensity: 'subtle'
  });
  if (result.ok) {
    checks.push({
      step: 'fetch-and-parse',
      ok: true,
      message: `Page récupérée depuis ${result.sourceUrl}, ${result.blocksCount} blocs extraits`,
      sourceUrl: result.sourceUrl,
      blocksDetected: result.blocksCount,
      blockTypes: result.blocks?.map((b: any) => b.type)
    });
  } else {
    checks.push({ step: 'fetch-and-parse', ok: false, message: 'Échec fetch ou parsing: ' + result.error });
  }

  // 3. Capacité de création (test d'écriture en DB sur un block bidon puis suppression)
  try {
    const test = await (prisma as any).pageBlock.create({
      data: {
        pageSlug: '__verify-test__' + Date.now(),
        position: 0, width: 'full', height: 'auto',
        type: 'spacer', data: { height: 1 }, visible: false
      }
    });
    await (prisma as any).pageBlock.delete({ where: { id: test.id } });
    checks.push({ step: 'db-write', ok: true, message: 'Création/suppression PageBlock OK' });
  } catch (e: any) {
    checks.push({ step: 'db-write', ok: false, message: 'Impossible d\'écrire en DB: ' + e?.message });
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({
    ok: allOk,
    slug,
    diagnostic: allOk
      ? '✅ Tout fonctionne. L\'import sauvegardera bien les blocs.'
      : '⚠️ Problème détecté. Voir les checks ci-dessous.',
    checks,
    suggestion: allOk
      ? 'Tu peux cliquer sur "Importer la page actuelle" en toute confiance.'
      : 'Corrige le check en échec avant de lancer l\'import.',
    blocksPreview: result.blocks?.slice(0, 3)
  });
}
