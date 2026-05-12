import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Journal IA — voix éditoriale quotidienne du site.
 *
 * GET  /api/orgs/[slug]/journal-ia?from=YYYY-MM-DD&to=YYYY-MM-DD
 *      → liste SiteJournal entries publiées
 *
 * DELETE accepted via /[id] route.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const db = await getTenantPrisma(slug);
  const url = req.nextUrl;
  const fromStr = url.searchParams.get('from');
  const toStr = url.searchParams.get('to');
  const limit = Math.min(Number(url.searchParams.get('limit') || 60), 200);
  const where: any = { approved: true };
  if (fromStr || toStr) {
    where.date = {};
    if (fromStr) where.date.gte = new Date(fromStr);
    if (toStr) where.date.lte = new Date(toStr);
  }
  const entries = await db.siteJournal.findMany({
    where, orderBy: { date: 'desc' }, take: limit,
  });
  return NextResponse.json({ items: entries });
}

/**
 * POST /api/orgs/[slug]/journal-ia
 * body: { date?, body, mood?, moodScore?, bodyShort?, stats? }
 * Manual override / créer un entry à la main.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const body = String(b.body || '').trim();
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 });

  const date = b.date ? new Date(b.date) : new Date();
  date.setUTCHours(0, 0, 0, 0);

  const db = await getTenantPrisma(slug);
  const entry = await db.siteJournal.upsert({
    where: { date },
    update: {
      body, mood: b.mood || 'neutral', moodScore: Number(b.moodScore || 0.5),
      bodyShort: b.bodyShort || body.slice(0, 200),
      stats: b.stats || null,
      approved: true,
      generatedBy: 'manual',
    },
    create: {
      date,
      body, mood: b.mood || 'neutral', moodScore: Number(b.moodScore || 0.5),
      bodyShort: b.bodyShort || body.slice(0, 200),
      stats: b.stats || null,
      approved: true,
      generatedBy: 'manual',
    },
  });
  return NextResponse.json({ ok: true, entry });
}
