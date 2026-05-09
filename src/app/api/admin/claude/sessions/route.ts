import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if ((s.user as any)?.role !== 'ADMIN') return null;
  return s;
}

/** GET /api/admin/claude/sessions — liste les 50 dernières sessions */
export async function GET(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  if (sessionId) {
    // Détail d'une session avec tous ses messages
    const sess = await prisma.claudeSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { index: 'asc' } } }
    });
    if (!sess) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ ok: true, session: sess });
  }

  const sessions = await prisma.claudeSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, prompt: true, model: true, permissionMode: true,
      status: true, durationMs: true, totalInputTokens: true, totalOutputTokens: true,
      errorMessage: true, createdAt: true, finishedAt: true,
      _count: { select: { messages: true } }
    }
  });

  return NextResponse.json({ ok: true, sessions });
}

/** DELETE /api/admin/claude/sessions?sessionId=X */
export async function DELETE(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId-required' }, { status: 400 });

  await prisma.claudeSession.delete({ where: { id: sessionId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
