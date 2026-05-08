import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ask } from '@/lib/rag';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/admin/knowledge/playground
 * Body : { question, locale?, bypassGuardrails?: boolean }
 * Réponse : AskResult complet avec debugPrompt et chunks détaillés
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  if (!body?.question || typeof body.question !== 'string') {
    return NextResponse.json({ error: 'question manquante' }, { status: 400 });
  }

  try {
    const result = await ask(body.question, {
      locale: body.locale,
      bypassGuardrails: !!body.bypassGuardrails,
      debug: true,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'ask KO' }, { status: 500 });
  }
}
