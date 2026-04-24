import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DonateSettings } from '@/components/admin/DonateSettings';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const rows = await prisma.setting.findMany({
    where: { key: { in: [
      'integrations.square.accessToken',
      'integrations.square.locationId',
      'integrations.square.applicationId',
      'integrations.square.environment',
      'donate.amounts',
      'donate.tickerItems'
    ] } }
  });
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-display font-bold mb-2">Dons & ticker</h1>
      <p className="text-zinc-400 mb-8">
        Configure ta connexion Square (Apple Pay, Google Pay, CB) + le bandeau défilant style Times Square.
      </p>
      <DonateSettings initial={settings} />
    </div>
  );
}
