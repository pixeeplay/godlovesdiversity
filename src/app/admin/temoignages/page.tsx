import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { TestimoniesAdmin } from '@/components/admin/TestimoniesAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminTestimoniesPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  let testimonies: any[] = [];
  try {
    testimonies = await prisma.videoTestimony.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  } catch { /* migration */ }
  return <TestimoniesAdmin initial={testimonies} />;
}
