import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || !['ADMIN', 'EDITOR'].includes((s.user as any).role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { reportId, action } = await req.json();
  const r = await prisma.connectReport.findUnique({ where: { id: reportId } });
  if (!r) return NextResponse.json({ error: 'introuvable' }, { status: 404 });

  if (action === 'dismiss') {
    await prisma.connectReport.update({ where: { id: reportId }, data: { status: 'dismissed', reviewedAt: new Date() } });
  } else if (action === 'remove') {
    if (r.contentType === 'post' && r.contentId) {
      await prisma.connectPost.update({ where: { id: r.contentId }, data: { moderationStatus: 'removed' } }).catch(() => null);
    }
    if (r.contentType === 'message' && r.contentId) {
      await prisma.connectMessage.update({ where: { id: r.contentId }, data: { moderationStatus: 'removed' } }).catch(() => null);
    }
    await prisma.connectReport.update({ where: { id: reportId }, data: { status: 'actioned', reviewedAt: new Date() } });
  } else if (action === 'ban') {
    // Block automatique de l'user signalé pour tout le monde (mode "shadow ban" : profil masqué partout)
    await prisma.connectProfile.update({
      where: { userId: r.reportedId },
      data: { showInMur: false, showInRencontres: false, showInPro: false }
    }).catch(() => null);
    await prisma.connectReport.update({ where: { id: reportId }, data: { status: 'actioned', reviewedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
