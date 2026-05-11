import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/super-admin';
import { SuperAdminShell } from '@/components/SuperAdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try { await requireSuperAdmin(); } catch { redirect('/dashboard'); }
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
