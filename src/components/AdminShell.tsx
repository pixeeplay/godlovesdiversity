'use client';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import type { MenuPermissions } from '@/lib/menu-permissions';

export function AdminShell({
  children,
  role = 'EDITOR',
  perms = { hidden: [], editorHidden: [] }
}: {
  children: React.ReactNode;
  role?: string;
  perms?: MenuPermissions;
}) {
  const pathname = usePathname();
  // Pas de sidebar sur la page de login
  const showSidebar = !pathname?.startsWith('/admin/login');

  return (
    <div className="flex min-h-screen">
      {showSidebar && <AdminSidebar role={role} perms={perms} />}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
