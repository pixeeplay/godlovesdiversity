import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const tenantDb = await getTenantPrisma(orgSlug);
  const template = await (tenantDb as any).emailTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, template });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  for (const k of ['name', 'type', 'subject', 'body'] as const) if (k in body) data[k] = body[k];
  if ('active' in body) data.active = !!body.active;
  if (Array.isArray(body.variables)) data.variables = body.variables;

  const tenantDb = await getTenantPrisma(orgSlug);
  const template = await (tenantDb as any).emailTemplate.update({ where: { id }, data });
  return NextResponse.json({ ok: true, template });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const tenantDb = await getTenantPrisma(orgSlug);
  await (tenantDb as any).emailTemplate.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
