import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CouponsAdmin } from '@/components/admin/CouponsAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  let coupons: any[] = [];
  try { coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }); } catch { /* migration */ }
  return <CouponsAdmin initial={coupons} />;
}
