import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import { importPageFromLive, type EffectIntensity } from '@/lib/page-import-service';
import { PAGE_CATALOG } from '@/lib/page-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Page Import Agent — agent dédié de re-synchronisation des pages.
 *
 * - Cron : `*‎/30 * * * *` (toutes les 30 min) ou manuel via POST.
 * - Auth : header `x-cron-token: $CRON_TOKEN`
 *
 * Politique :
 *   - Liste les pages discovered (src/app/[locale]/*‎/page.tsx)
 *   - Import seulement les pages qui n'ont pas encore de blocs (codeOnly)
 *   - OU les pages qui ont été marquées comme "stale" (param force=slug1,slug2)
 *   - effectIntensity par défaut: subtle (pour ne pas tout casser)
 *   - mode par défaut: append (préserve les édits manuels)
 *
 * Logs chaque exécution dans la DB (model PageImportLog si on l'ajoute,
 * sinon return JSON résumé).
 */

const EXCLUDED_PREFIXES = [
  'admin', 'admin/login', 'connect', 'mon-espace',
  'api', 'demo-parallax-photo' // exclude la demo qui a son propre auto-seed
];

export async function POST(req: NextRequest) {
  return runAgent(req);
}
export async function GET(req: NextRequest) {
  return runAgent(req);
}

async function runAgent(req: NextRequest) {
  // Auth via cron token
  const expected = process.env.CRON_TOKEN || process.env.CRON_SECRET;
  const auth = req.headers.get('x-cron-token') || req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (expected && auth !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get('force')?.split(',').filter(Boolean) || [];
  const intensity = (url.searchParams.get('intensity') as EffectIntensity) || 'subtle';
  const onlyEmpty = url.searchParams.get('onlyEmpty') !== 'false';
  const locale = url.searchParams.get('locale') || 'fr';

  // 1. Catalog hardcoded + scan fs (dev) → set unique
  const foundSet = new Set<string>(PAGE_CATALOG.map((p) => p.slug).filter(Boolean));
  const cwd = process.cwd();
  const root = path.join(cwd, 'src', 'app', '[locale]');
  async function walk(dir: string, prefix: string, depth: number) {
    if (depth > 3) return;
    let entries: any[] = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    if (entries.some((e) => e.isFile() && e.name === 'page.tsx') && prefix) foundSet.add(prefix);
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('_')) {
        await walk(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name, depth + 1);
      }
    }
  }
  await walk(root, '', 0).catch(() => {});
  const found = Array.from(foundSet);

  // 2. Détermine les slugs à traiter
  let toProcess: string[];
  if (force.length > 0) {
    toProcess = force;
  } else if (onlyEmpty) {
    const existing = await (prisma as any).pageBlock.groupBy({
      by: ['pageSlug'],
      _count: { _all: true }
    }).catch(() => []);
    const slugsWithBlocks = new Set(existing.map((b: any) => b.pageSlug));
    toProcess = found.filter((s) => !slugsWithBlocks.has(s));
  } else {
    toProcess = found;
  }
  toProcess = toProcess.filter((s) => !EXCLUDED_PREFIXES.some((p) => s === p || s.startsWith(`${p}/`)));

  // 3. Build base URL
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  // 4. Process avec concurrency 2
  const results: any[] = [];
  const concurrency = 2;
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const r = await Promise.all(batch.map(async (slug) => {
      const startedAt = Date.now();
      const res = await importPageFromLive({
        slug,
        baseUrl,
        locale,
        mode: force.includes(slug) ? 'replace' : 'append',
        effectIntensity: intensity
      }).catch((e) => ({ ok: false, slug, blocksCount: 0, error: e?.message || 'unknown' }));
      return { ...res, durationMs: Date.now() - startedAt };
    }));
    results.push(...r);
  }

  return NextResponse.json({
    ok: true,
    agent: 'page-import-agent',
    intensity,
    mode: force.length > 0 ? 'replace (forced)' : 'append',
    locale,
    summary: {
      discovered: found.length,
      processed: toProcess.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      blocksCreated: results.reduce((sum, r) => sum + (r.blocksCount || 0), 0),
      durationMs: results.reduce((sum, r) => sum + (r.durationMs || 0), 0)
    },
    results,
    runAt: new Date().toISOString()
  });
}
