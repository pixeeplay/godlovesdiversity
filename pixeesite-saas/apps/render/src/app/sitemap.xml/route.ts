import { NextResponse } from 'next/server';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function GET() {
  const org = await getCurrentOrg();
  if (!org) return new NextResponse('', { status: 404 });
  const db = await getCurrentTenantDb();
  const h = await headers();
  const host = h.get('host') || `${org.slug}.pixeeplay.com`;
  const proto = host.includes('localhost') ? 'http' : 'https';
  const base = `${proto}://${host}`;

  const [pages, articles, products, threads, custom] = await Promise.all([
    db?.sitePage.findMany({ where: { visible: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
    db?.article.findMany({ where: { status: 'published' } as any, select: { slug: true, updatedAt: true } }).catch(() => []),
    db?.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
    (db as any)?.forumThread?.findMany({ select: { slug: true, updatedAt: true } }).catch(() => []),
    (db as any)?.sitemapEntry?.findMany({ where: { visibleSEO: true } }).catch(() => []),
  ] as any);

  const urls: { loc: string; lastmod?: string; priority?: number; changefreq?: string }[] = [
    { loc: `${base}/`, priority: 1.0, changefreq: 'weekly' },
  ];
  for (const p of pages || []) urls.push({ loc: `${base}${p.slug}`, lastmod: p.updatedAt?.toISOString() });
  for (const a of articles || []) urls.push({ loc: `${base}/blog/${a.slug}`, lastmod: a.updatedAt?.toISOString(), changefreq: 'monthly' });
  for (const p of products || []) urls.push({ loc: `${base}/shop/${p.slug}`, lastmod: p.updatedAt?.toISOString() });
  for (const t of threads || []) urls.push({ loc: `${base}/forum/${t.slug}`, lastmod: t.updatedAt?.toISOString() });
  for (const c of custom || []) urls.push({ loc: `${base}${c.path}`, priority: c.priority, changefreq: c.changefreq });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    ${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}
    ${u.priority !== undefined ? `<priority>${u.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
