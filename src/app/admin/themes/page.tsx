import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ThemesAdmin } from '@/components/admin/ThemesAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminThemesPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  let themes: any[] = [];
  try {
    themes = await prisma.theme.findMany({ orderBy: [{ category: 'asc' }, { priority: 'desc' }, { name: 'asc' }] });
  } catch { /* migration */ }
  return <ThemesAdmin initial={themes} />;
}
