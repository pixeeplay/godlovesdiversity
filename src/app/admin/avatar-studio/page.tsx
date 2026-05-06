import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AvatarStudioClient } from '@/components/admin/AvatarStudioClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Avatar Studio · GLD Admin' };

export default async function AvatarStudioPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') redirect('/admin');
  return <AvatarStudioClient />;
}
