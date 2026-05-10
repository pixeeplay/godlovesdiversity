import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const orgs = ((session.user as any).orgs || []) as Array<{ slug: string; name: string; plan: string; role: string }>;

  // Si une seule org, redirige direct dessus
  if (orgs.length === 1) redirect(`/dashboard/orgs/${orgs[0]!.slug}`);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Bienvenue {session.user.name || session.user.email} 👋</h1>
      <p style={{ opacity: 0.6, marginBottom: 32 }}>Choisis une organisation pour continuer.</p>

      <div style={{ display: 'grid', gap: 12 }}>
        {orgs.map((o) => (
          <Link
            key={o.slug}
            href={`/dashboard/orgs/${o.slug}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: 16,
              background: '#18181b', border: '1px solid #27272a', borderRadius: 12,
              textDecoration: 'none', color: 'inherit',
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {o.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{o.name}</div>
              <div style={{ fontSize: 12, opacity: 0.5, textTransform: 'uppercase' }}>{o.plan} · {o.role} · {o.slug}.pixeesite.app</div>
            </div>
            <span style={{ opacity: 0.5, fontSize: 20 }}>→</span>
          </Link>
        ))}
        <Link
          href="/signup"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16,
            background: '#10b98115', border: '1px dashed #10b981', borderRadius: 12,
            color: '#10b981', textDecoration: 'none', fontWeight: 600,
          }}
        >+ Créer une nouvelle organisation</Link>
      </div>
    </div>
  );
}
