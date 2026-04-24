import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { HomeEditor } from '@/components/admin/HomeEditor';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: 'home.' } }
  });
  const branding = await prisma.setting.findMany({
    where: { key: { in: ['site.logoUrl', 'site.title', 'site.tagline'] } }
  });
  const settings: Record<string, string> = {
    ...Object.fromEntries(rows.map((r) => [r.key, r.value])),
    ...Object.fromEntries(branding.map((r) => [r.key, r.value]))
  };
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-display font-bold mb-2">Page d'accueil</h1>
      <p className="text-zinc-400 mb-8">
        Édite le hero, le manifeste, les 4 piliers et l'appel à l'action.
        Tout est répercuté en temps réel sur le site public.
      </p>
      <HomeEditor initial={settings} />
    </div>
  );
}
