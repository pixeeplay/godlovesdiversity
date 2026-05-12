import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH  /api/orgs/[slug]/journal-ia/[id]   → mise à jour (body, mood, approved)
 * DELETE /api/orgs/[slug]/journal-ia/[id]
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  const db = await getTenantPrisma(slug);
  const entry = await db.siteJournal.update({
    where: { id },
    data: {
      ...(b.body !== undefined && { body: String(b.body) }),
      ...(b.bodyShort !== undefined && { bodyShort: String(b.bodyShort) }),
      ...(b.mood !== undefined && { mood: String(b.mood) }),
      ...(b.moodScore !== undefined && { moodScore: Number(b.moodScore) }),
      ...(b.approved !== undefined && { approved: Boolean(b.approved) }),
    },
  });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await db.siteJournal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
