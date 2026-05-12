import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Routes pour les règles d'autopilot IA (AiAutopilotRule).
 *   GET     /api/orgs/[slug]/ai-autopilot              → list règles
 *   POST    /api/orgs/[slug]/ai-autopilot              → create
 *
 * Les triggers possibles : 'cron' | 'webhook' | 'event' | 'manual'
 * Les actions possibles : 'generate-newsletter' | 'post-social' | 'send-email' |
 *                         'generate-article' | 'generate-manual' | 'moderate-forum' |
 *                         'classify-leads' | 'translate-content'
 *
 * NB : la table AiAutopilotRule n'est pas dans le schema Prisma, on passe par $queryRawUnsafe.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiAutopilotRule" ORDER BY "createdAt" DESC`).catch(() => []);
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.name || !b.trigger || !b.action) return NextResponse.json({ error: 'name/trigger/action required' }, { status: 400 });
  const id = randomUUID();
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(
    `INSERT INTO "AiAutopilotRule" ("id","name","description","trigger","triggerConfig","action","actionConfig","schedule","active")
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9)`,
    id,
    String(b.name),
    b.description || null,
    String(b.trigger),
    JSON.stringify(b.triggerConfig || {}),
    String(b.action),
    JSON.stringify(b.actionConfig || {}),
    b.schedule || null,
    b.active !== false
  );
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiAutopilotRule" WHERE id = $1`, id);
  return NextResponse.json({ ok: true, item: rows?.[0] });
}
