import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const orgs = ((session.user as any).orgs || []) as Array<{ slug: string; name: string; plan: string; role: string }>;

  if (orgs.length === 1) redirect(`/dashboard/orgs/${orgs[0]!.slug}`);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #d946ef 0%, #8b5cf6 50%, #06b6d4 100%)', borderRadius: 14, padding: '24px 28px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
        <div style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👋</div>
        <div style={{ flex: 1, color: 'white' }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>Bienvenue {session.user.name || session.user.email}</h1>
          <p style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>Choisis une organisation pour continuer, ou crées-en une nouvelle.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {orgs.map((o, i) => {
          const grads = [
            'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
            'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
            'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          ];
          return (
            <Link key={o.slug} href={`/dashboard/orgs/${o.slug}`}
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: 16, textDecoration: 'none', color: 'inherit', display: 'flex', gap: 14, alignItems: 'center', transition: 'transform .15s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: grads[i % grads.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'white' }}>
                {o.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{o.name}</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{o.slug}.pixeeplay.com</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#d946ef22', color: '#d946ef', fontWeight: 700, textTransform: 'uppercase' }}>{o.plan}</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#06b6d422', color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase' }}>{o.role}</span>
                </div>
              </div>
              <span style={{ opacity: 0.4, fontSize: 18 }}>→</span>
            </Link>
          );
        })}
        <Link href="/signup"
          style={{ background: '#10b98110', border: '2px dashed #10b981', borderRadius: 14, padding: 16, color: '#10b981', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 84, fontSize: 14 }}>
          + Nouvelle organisation
        </Link>
      </div>
    </div>
  );
}
