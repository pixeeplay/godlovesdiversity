import '../globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { Providers } from '@/components/Providers';

export const metadata = { title: 'Back-office — God Loves Diversity' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="bg-zinc-950">
      <body className="min-h-screen text-white">
        <Providers>
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  // Login page is its own thing — handled inside the route
  return (
    <div className="flex min-h-screen">
      {session && <AdminSidebar />}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
