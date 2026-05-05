import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/research/export?kind=peerHelp|venues|helplines&format=json|csv
 * Export agrégé/anonymisé pour ONG et chercheur·euses.
 * AUCUNE donnée personnelle (pas de nom, email, téléphone). Identifiants masqués.
 */
const ALLOWED = ['peerHelp', 'venues', 'helplines', 'events', 'forum-themes'];

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind');
  const format = req.nextUrl.searchParams.get('format') || 'json';
  if (!kind || !ALLOWED.includes(kind)) return NextResponse.json({ error: 'kind invalide', allowed: ALLOWED }, { status: 400 });

  let data: any[] = [];
  try {
    if (kind === 'peerHelp') {
      data = await prisma.peerHelp.findMany({
        where: { status: 'active' },
        select: { topic: true, country: true, urgent: true, supportCount: true, createdAt: true }
      });
    } else if (kind === 'venues') {
      data = await prisma.venue.findMany({
        where: { published: true },
        select: { type: true, rating: true, country: true, city: true, verified: true, featured: true, createdAt: true }
      });
    } else if (kind === 'events') {
      data = await prisma.event.findMany({
        where: { published: true },
        select: { country: true, city: true, tags: true, startsAt: true, cancelled: true }
      });
    } else if (kind === 'forum-themes') {
      // Distribution des sujets de discussion forum
      const cats = await prisma.forumCategory.findMany({
        select: { slug: true, _count: { select: { threads: true } } }
      });
      data = cats.map(c => ({ category: c.slug, threadCount: c._count.threads }));
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }

  if (format === 'csv') {
    const headers = data[0] ? Object.keys(data[0]) : [];
    const rows = data.map(d => headers.map(h => JSON.stringify((d as any)[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="gld-${kind}.csv"` }
    });
  }

  return NextResponse.json({
    license: 'CC-BY-4.0',
    source: 'God Loves Diversity (gld.pixeeplay.com)',
    notice: 'Données 100% anonymes. Aucune donnée personnelle.',
    kind,
    count: data.length,
    extractedAt: new Date().toISOString(),
    data
  });
}
