// Layout minimal isolé — pas de Providers, pas d'AdminShell, pas de [locale].
// Sert à offrir une route de secours si /admin/login casse pour une raison X.
export const metadata = { title: 'Accès Admin — GLD' };
export const dynamic = 'force-dynamic';

export default function Admin2AccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
