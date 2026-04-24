import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NewsletterEditor } from '@/components/admin/NewsletterEditor';
import { SubscribersList } from '@/components/admin/SubscribersList';

export const dynamic = 'force-dynamic';

export default async function NewsletterAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const [campaigns, active, pending, unsub, bounced] = await Promise.all([
    prisma.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'PENDING' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'BOUNCED' } })
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Newsletter</h1>
      <p className="text-zinc-400 mb-6">
        <strong className="text-emerald-400">{active}</strong> actifs ·
        <strong className="text-amber-400 ml-1">{pending}</strong> en attente ·
        <strong className="text-zinc-300 ml-1">{unsub}</strong> désinscrits ·
        <strong className="text-red-400 ml-1">{bounced}</strong> bouncés
      </p>

      {/* 1. Liste des abonnés */}
      <SubscribersList />

      {/* 2. Composer une campagne */}
      <h2 className="mt-12 mb-4 text-xl font-bold">Composer une campagne</h2>
      <NewsletterEditor />

      {/* 3. Historique */}
      <h2 className="mt-12 mb-4 text-xl font-bold">Historique des envois</h2>
      <div className="space-y-2">
        {campaigns.length === 0 && <p className="text-zinc-500 italic">Aucune campagne.</p>}
        {campaigns.map((c) => (
          <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.subject}</div>
              <div className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleString('fr-FR')}</div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400">{c.recipients} envois</span>
              <span className={`text-xs px-2 py-1 rounded ${c.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-700 text-zinc-300'}`}>
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
