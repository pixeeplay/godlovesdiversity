import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setSetting } from '@/lib/settings';
import { loadAiConfig, pingProvider, generateForTask, type AiTaskKey } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET    /api/admin/ai-providers              → providers + mappings actuels
 * GET    /api/admin/ai-providers?ping=ID      → health-check du provider ID
 * POST   /api/admin/ai-providers              → save (body: { providers, mappings })
 * POST   /api/admin/ai-providers?test=task    → test une tâche live
 */

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return null;
  return s;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const cfg = await loadAiConfig();

  const pingId = url.searchParams.get('ping');
  if (pingId) {
    const provider = cfg.providers.find(p => p.id === pingId);
    if (!provider) return NextResponse.json({ error: 'provider-not-found' }, { status: 404 });
    const result = await pingProvider(provider);
    return NextResponse.json(result);
  }

  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const testTask = url.searchParams.get('test');

  if (testTask) {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt || 'Dis bonjour en 10 mots.');
    const r = await generateForTask(testTask as AiTaskKey, { prompt, maxTokens: 200 });
    return NextResponse.json(r);
  }

  const body = await req.json().catch(() => ({}));
  if (Array.isArray(body.providers)) {
    await setSetting('ai.providers', JSON.stringify(body.providers));
  }
  if (body.mappings && typeof body.mappings === 'object') {
    await setSetting('ai.task-mappings', JSON.stringify(body.mappings));
  }
  return NextResponse.json({ ok: true });
}
