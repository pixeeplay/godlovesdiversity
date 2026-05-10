import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import { PAGE_CATALOG, CATEGORIES, getPageMeta } from '@/lib/page-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/page-builder/discover
 *
 * Source de vérité = PAGE_CATALOG (hardcoded, fonctionne en prod) +
 * scan opportuniste fs (si disponible en dev) + slugs orphelins en DB.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 1. Liste depuis le catalogue hardcoded (fonctionne toujours)
  const slugsFromCatalog = new Set(PAGE_CATALOG.map((p) => p.slug));

  // 2. Tentative de scan fs en plus (utile en dev)
  const cwd = process.cwd();
  const root = path.join(cwd, 'src', 'app', '[locale]');
  async function walk(dir: string, prefix: string, depth: number, acc: Set<string>) {
    if (depth > 3) return;
    let entries: any[] = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    if (entries.some((e) => e.isFile() && e.name === 'page.tsx') && prefix) acc.add(prefix);
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('_')) {
        await walk(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name, depth + 1, acc);
      }
    }
  }
  await walk(root, '', 0, slugsFromCatalog).catch(() => {});

  // 3. Récupère les slugs avec blocs en DB
  const blocks = await (prisma as any).pageBlock.groupBy({
    by: ['pageSlug'],
    _count: { _all: true }
  }).catch(() => []);
  const slugsWithBlocks = new Map<string, number>();
  for (const b of blocks) slugsWithBlocks.set(b.pageSlug, b._count?._all || 0);

  // 4. Construit la liste finale
  const allSlugs = new Set<string>([...Array.from(slugsFromCatalog), ...Array.from(slugsWithBlocks.keys())]);
  const pages = Array.from(allSlugs).map((slug) => {
    const meta = getPageMeta(slug);
    const count = slugsWithBlocks.get(slug) || 0;
    const inCatalog = slugsFromCatalog.has(slug);
    return {
      slug,
      label: meta.label,
      desc: meta.desc,
      emoji: meta.emoji,
      category: meta.category,
      blockCount: count,
      hasCode: inCatalog,
      status: count > 0 ? (inCatalog ? 'edited' : 'orphan') : 'codeOnly'
    };
  });

  return NextResponse.json({
    pages: pages.sort((a, b) => a.label.localeCompare(b.label)),
    categories: CATEGORIES,
    summary: {
      total: pages.length,
      edited: pages.filter((p) => p.status === 'edited').length,
      codeOnly: pages.filter((p) => p.status === 'codeOnly').length,
      orphan: pages.filter((p) => p.status === 'orphan').length
    }
  });
}
