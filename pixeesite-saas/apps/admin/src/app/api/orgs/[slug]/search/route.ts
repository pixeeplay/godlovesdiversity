import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/search?q=...
 * Cross-entity search : pages, articles, products, leads, threads, tasks.
 * Returns top 5 par catégorie.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  const db = await getTenantPrisma(slug);
  const ic = { contains: q, mode: 'insensitive' as const };

  const [pages, articles, products, leads, threads, tasks] = await Promise.all([
    db.sitePage.findMany({ where: { OR: [{ title: ic }, { slug: ic }] }, take: 5, select: { id: true, title: true, slug: true } }).catch(() => []),
    db.article.findMany({ where: { OR: [{ title: ic }, { excerpt: ic }] }, take: 5, select: { id: true, title: true, slug: true } }).catch(() => []),
    db.product.findMany({ where: { OR: [{ name: ic }, { description: ic }] }, take: 5, select: { id: true, name: true, slug: true } }).catch(() => []),
    db.lead.findMany({ where: { OR: [{ email: ic }, { firstName: ic }, { lastName: ic }, { company: ic }] }, take: 5, select: { id: true, email: true, firstName: true, lastName: true } }).catch(() => []),
    (db as any).forumThread?.findMany({ where: { OR: [{ title: ic }, { body: ic }] }, take: 5, select: { id: true, title: true, slug: true } }).catch(() => []),
    (db as any).task?.findMany({ where: { OR: [{ title: ic }, { description: ic }] }, take: 5, select: { id: true, title: true, status: true } }).catch(() => []),
  ]);

  const results = [
    ...pages.map((p: any) => ({ type: 'page', label: p.title, href: `/dashboard/orgs/${slug}/sites?page=${p.id}` })),
    ...articles.map((a: any) => ({ type: 'article', label: a.title, href: `/dashboard/orgs/${slug}/blog` })),
    ...products.map((p: any) => ({ type: 'product', label: p.name, href: `/dashboard/orgs/${slug}/shop` })),
    ...leads.map((l: any) => ({ type: 'lead', label: `${l.firstName || ''} ${l.lastName || ''} ${l.email}`.trim(), href: `/dashboard/orgs/${slug}/leads` })),
    ...(threads || []).map((t: any) => ({ type: 'thread', label: t.title, href: `/dashboard/orgs/${slug}/forum` })),
    ...(tasks || []).map((t: any) => ({ type: 'task', label: t.title, href: `/dashboard/orgs/${slug}/tasks` })),
  ];

  return NextResponse.json({ results });
}
