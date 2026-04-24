import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-display font-bold mb-2">Paramètres</h1>
      <p className="text-zinc-400 mb-8">
        Configure ici les clés API et les réglages du site. Les valeurs sont stockées
        en base et prennent le pas sur celles du fichier <code>.env</code>.
      </p>
      <SettingsForm initial={settings} />
    </div>
  );
}
