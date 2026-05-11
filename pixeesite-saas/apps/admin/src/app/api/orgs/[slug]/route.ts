import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  const data: any = {};
  if (b.name) data.name = b.name;
  if (b.primaryColor) data.primaryColor = b.primaryColor;
  if (b.font) data.font = b.font;
  if (b.logoUrl !== undefined) data.logoUrl = b.logoUrl || null;
  const updated = await platformDb.org.update({ where: { id: auth.membership.org.id }, data });
  return NextResponse.json({ ok: true, org: updated });
}
