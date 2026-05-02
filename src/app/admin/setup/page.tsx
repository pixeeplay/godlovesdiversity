import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SetupWizard } from '@/components/admin/SetupWizard';

export default async function SetupPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  // Charge tous les settings pour pré-remplir et calculer ce qui est déjà configuré
  const settings = await prisma.setting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <SetupWizard initial={settingsMap} />
    </div>
  );
}
