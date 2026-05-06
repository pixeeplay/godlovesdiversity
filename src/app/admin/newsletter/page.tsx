import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NewsletterEditor } from '@/components/admin/NewsletterEditor';
import { SubscribersList } from '@/components/admin/SubscribersList';
import { EmailDeliveryPanel } from '@/components/admin/EmailDeliveryPanel';
import { CampaignHistoryList } from '@/components/admin/CampaignHistoryList';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Mail, Send, CheckCircle2, AlertCircle, Users, Clock, History } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewsletterAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const [active, pending, unsub, bounced] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'PENDING' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'BOUNCED' } })
  ]);

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <AdminPageHeader
        icon={Mail}
        gradient="from-pink-500 to-violet-500"
        title="Newsletter"
        subtitle="Gère tes abonnés, compose et envoie tes campagnes, et vérifie que les emails sont bien livrés."
      />

      {/* STATS abonnés */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Actifs" value={active} sub="abonnés confirmés" gradient="from-emerald-500 to-green-600" Icon={CheckCircle2} />
        <StatCard label="En attente" value={pending} sub="confirmation à venir" gradient="from-amber-500 to-orange-500" Icon={Clock} />
        <StatCard label="Désinscrits" value={unsub} sub="hors liste" gradient="from-zinc-500 to-zinc-700" Icon={Users} />
        <StatCard label="Bouncés" value={bounced} sub="emails invalides" gradient="from-red-500 to-rose-600" Icon={AlertCircle} />
      </section>

      {/* DIAGNOSTIC ENVOI EMAIL */}
      <EmailDeliveryPanel defaultTestEmail={s.user?.email || ''} />

      {/* LISTE ABONNÉS */}
      <h2 className="text-xl font-bold mt-8 flex items-center gap-2">
        <Users size={18} className="text-brand-pink" /> Abonnés
      </h2>
      <SubscribersList />

      {/* COMPOSER */}
      <h2 className="text-xl font-bold mt-8 flex items-center gap-2">
        <Send size={18} className="text-brand-pink" /> Composer une campagne
      </h2>
      <NewsletterEditor />

      {/* HISTORIQUE CAMPAGNES — vrai gestionnaire avec preview, test, schedule, etc. */}
      <h2 className="text-xl font-bold mt-8 flex items-center gap-2">
        <History size={18} className="text-brand-pink" /> Historique des campagnes
      </h2>
      <p className="text-xs text-zinc-500 -mt-3">
        Aperçu, test, programmation, dupliquer, renvoyer — tout est possible depuis chaque ligne.
      </p>
      <CampaignHistoryList defaultTestEmail={s.user?.email || ''} />
    </div>
  );
}

function StatCard({ label, value, sub, gradient, Icon }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
      <Icon size={20} className="opacity-90 mb-2" />
      <div className="text-2xl md:text-3xl font-bold leading-none mb-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-90 font-semibold">{label}</div>
      {sub && <div className="text-[10px] opacity-75 mt-1">{sub}</div>}
    </div>
  );
}
