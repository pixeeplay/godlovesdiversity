import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { reportedId, contentType, contentId, reason, details } = await req.json();
  if (!reportedId || !reason) return NextResponse.json({ error: 'paramètres manquants' }, { status: 400 });

  const report = await prisma.connectReport.create({
    data: { reporterId: u.id, reportedId, contentType, contentId, reason, details }
  });
  return NextResponse.json({ ok: true, report });
}
