import '../globals.css';
import { AdminShell } from '@/components/AdminShell';
import { Providers } from '@/components/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMenuPermissions } from '@/lib/menu-permissions';

export const metadata = {
  title: 'Back-office — God Loves Diversity',
  themeColor: '#09090b',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover'
};
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Note : la redirection si pas connecté est gérée par middleware.ts (côté edge).
  // Le layout reste light pour éviter les boucles avec /admin/login.
  const session = await getServerSession(authOptions);
  const role = ((session?.user as any)?.role as string) || 'EDITOR';
  const perms = await getMenuPermissions().catch(() => ({ hidden: [], editorHidden: [] }));

  return (
    <html lang="fr" className="bg-zinc-950 dark" style={{ colorScheme: 'dark' }}>
      <head>
        {/* Force dark mode UI elements (scrollbar etc) sur iOS/Android */}
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#09090b" />
        {/* iPad Safari : empêche les "smart" gestures (back-swipe quand drawer ouvert) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className="min-h-screen text-white antialiased"
        style={{
          backgroundColor: '#09090b',
          minHeight: '100vh',
          // @ts-ignore — vendor property
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <Providers>
          <AdminShell role={role} perms={perms}>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
