'use client';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Pas de sidebar sur la page de login
  const showSidebar = !pathname?.startsWith('/admin/login');

  return (
    <div className="flex min-h-screen">
      {showSidebar && <AdminSidebar />}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
