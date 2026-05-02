import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { IntegrationsManager } from '@/components/admin/IntegrationsManager';

export default async function IntegrationsPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  // Charge les settings existants pour pré-remplir
  const settings = await prisma.setting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Intégrations & Connexions</h1>
      <p className="text-zinc-400 mb-8">
        Connecte des services externes pour étendre les capacités du site (notifications Telegram, webhooks, automatisations Slack, etc.).
      </p>
      <IntegrationsManager initial={settingsMap} />
    </div>
  );
}
