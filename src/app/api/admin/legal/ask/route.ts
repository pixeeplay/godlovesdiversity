import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { askLegal } from '@/lib/legal-rag';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/legal/ask
 * Body : { question, skill? (filtre comptable/notaire/...), debug? }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body?.question) return NextResponse.json({ error: 'question manquante' }, { status: 400 });
  try {
    const r = await askLegal(body.question, {
      skill: typeof body.skill === 'string' ? body.skill : undefined,
      debug: !!body.debug,
    });
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'ask KO' }, { status: 500 });
  }
}
