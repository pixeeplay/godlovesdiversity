import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LegalAdmin } from '@/components/admin/LegalAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: '⚖️ Assistant juridique · GLD Admin' };

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <LegalAdmin />;
}
