import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ModerationQueue } from '@/components/admin/ConnectModerationQueue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Modération Connect — GLD Admin' };

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login');

  let reports: any[] = [];
  let flaggedPosts: any[] = [];
  let flaggedMessages: any[] = [];
  try {
    [reports, flaggedPosts, flaggedMessages] = await Promise.all([
      prisma.connectReport.findMany({
        where: { status: 'pending' },
        include: { reporter: { select: { name: true, email: true } }, reported: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.connectPost.findMany({
        where: { moderationStatus: 'flagged' },
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.connectMessage.findMany({
        where: { moderationStatus: 'flagged' },
        include: { sender: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);
  } catch {}

  return <ModerationQueue reports={reports} flaggedPosts={flaggedPosts} flaggedMessages={flaggedMessages} />;
}
