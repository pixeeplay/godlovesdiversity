import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/orgs/[slug]/ai-autopilot/[id]   → update rule
 * DELETE /api/orgs/[slug]/ai-autopilot/[id]  → delete rule
 */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);

  // Build dynamic SET
  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (b.name !== undefined) { sets.push(`"name" = $${i++}`); values.push(b.name); }
  if (b.description !== undefined) { sets.push(`"description" = $${i++}`); values.push(b.description); }
  if (b.trigger !== undefined) { sets.push(`"trigger" = $${i++}`); values.push(b.trigger); }
  if (b.triggerConfig !== undefined) { sets.push(`"triggerConfig" = $${i++}::jsonb`); values.push(JSON.stringify(b.triggerConfig)); }
  if (b.action !== undefined) { sets.push(`"action" = $${i++}`); values.push(b.action); }
  if (b.actionConfig !== undefined) { sets.push(`"actionConfig" = $${i++}::jsonb`); values.push(JSON.stringify(b.actionConfig)); }
  if (b.schedule !== undefined) { sets.push(`"schedule" = $${i++}`); values.push(b.schedule); }
  if (b.active !== undefined) { sets.push(`"active" = $${i++}`); values.push(!!b.active); }
  sets.push(`"updatedAt" = CURRENT_TIMESTAMP`);

  if (sets.length === 1) return NextResponse.json({ ok: true });
  values.push(id);
  await (db as any).$executeRawUnsafe(`UPDATE "AiAutopilotRule" SET ${sets.join(', ')} WHERE "id" = $${i}`, ...values);
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiAutopilotRule" WHERE id = $1`, id);
  return NextResponse.json({ ok: true, item: rows?.[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(`DELETE FROM "AiAutopilotRule" WHERE "id" = $1`, id);
  return NextResponse.json({ ok: true });
}
