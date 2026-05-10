import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import { importPageFromLive, type EffectIntensity, type ImportMode } from '@/lib/page-import-service';
import { PAGE_CATALOG } from '@/lib/page-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const EXCLUDED_PREFIXES = [
  'admin', 'admin/login', 'connect', 'mon-espace', 'api',
  'demo-parallax-photo' // a son propre auto-seed
];

/**
 * POST /api/admin/page-builder/import-all
 * Body: {
 *   onlyCodeOnly?: true,
 *   mode?: 'replace' | 'append',
 *   effectIntensity?: 'none' | 'subtle' | 'medium' | 'wow',
 *   locale?: 'fr',
 *   concurrency?: 3
 * }
 *
 * Boucle sur toutes les pages discovered et importe leur contenu live en
 * blocs PageBlock via le service importPageFromLive.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const onlyCodeOnly = body.onlyCodeOnly !== false;
  const mode: ImportMode = (body.mode as ImportMode) || 'replace';
  const intensity: EffectIntensity = (body.effectIntensity as EffectIntensity) || 'subtle';
  const locale = (body.locale as string) || 'fr';
  const concurrency = Math.min(5, Math.max(1, body.concurrency || 3));

  // 1. Catalog hardcoded (prod-safe) + scan fs en bonus (dev)
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

  // 2. Filtre
  let slugs = found.filter((s) => !EXCLUDED_PREFIXES.some((p) => s === p || s.startsWith(`${p}/`)));
  if (onlyCodeOnly) {
    const existing = await (prisma as any).pageBlock.groupBy({
      by: ['pageSlug'],
      _count: { _all: true }
    }).catch(() => []);
    const slugsWithBlocks = new Set(existing.map((b: any) => b.pageSlug));
    slugs = slugs.filter((s) => !slugsWithBlocks.has(s));
  }

  // 3. Build base URL
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  // 4. Process avec concurrency
  const results: any[] = [];
  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency);
    const r = await Promise.all(batch.map(async (slug) => {
      const startedAt = Date.now();
      const res = await importPageFromLive({
        slug, baseUrl, locale, mode, effectIntensity: intensity
      }).catch((e) => ({ ok: false, slug, blocksCount: 0, error: e?.message || 'unknown' } as any));
      return { ...res, durationMs: Date.now() - startedAt };
    }));
    results.push(...r);
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total: slugs.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      totalBlocks: results.reduce((sum, r) => sum + (r.blocksCount || 0), 0),
      durationMs: results.reduce((sum, r) => sum + (r.durationMs || 0), 0)
    },
    intensity,
    mode,
    results
  });
}
