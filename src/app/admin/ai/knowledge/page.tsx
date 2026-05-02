import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { KnowledgeAdmin } from '@/components/admin/KnowledgeAdmin';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const [docs, settings, unanswered] = await Promise.all([
    prisma.knowledgeDoc.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, source: true, sourceType: true, author: true,
        tags: true, locale: true, enabled: true, createdAt: true,
        _count: { select: { chunks: true } }
      }
    }).catch(() => []),
    getSettings(['rag.systemPrompt']).catch(() => ({})),
    prisma.unansweredQuery.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50
    }).catch(() => [])
  ]);

  const initialDocs = docs.map((d) => ({
    ...d,
    chunkCount: d._count.chunks,
    createdAt: d.createdAt.toISOString()
  }));
  const initialUnanswered = unanswered.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString()
  }));

  return (
    <KnowledgeAdmin
      initialDocs={initialDocs as any}
      initialSystemPrompt={settings['rag.systemPrompt'] || ''}
      initialUnanswered={initialUnanswered as any}
    />
  );
}
