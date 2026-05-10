'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface Org { slug: string; name: string; plan: string; role: string; }

export function DashboardShell({ user, orgs, children }: { user: any; orgs: Org[]; children: React.ReactNode }) {
  const path = usePathname();
  const currentOrgSlug = path.match(/^\/dashboard\/orgs\/([^/]+)/)?.[1];
  const currentOrg = orgs.find((o) => o.slug === currentOrgSlug) || orgs[0];
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', padding: '20px 12px' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>🎨</span>
          <span style={{ fontWeight: 900, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pixeesite</span>
        </Link>

        {/* Org switcher */}
        {orgs.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              style={{ width: '100%', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 10, padding: 10, color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {currentOrg?.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentOrg?.name}</div>
                <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase' }}>{currentOrg?.plan} · {currentOrg?.role}</div>
              </div>
              <span style={{ opacity: 0.5 }}>▾</span>
            </button>
            {orgMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 10, padding: 4, zIndex: 10 }}>
                {orgs.map((o) => (
                  <Link
                    key={o.slug} href={`/dashboard/orgs/${o.slug}`}
                    onClick={() => setOrgMenuOpen(false)}
                    style={{ display: 'block', padding: 8, borderRadius: 6, fontSize: 13, color: 'inherit', textDecoration: 'none', background: o.slug === currentOrg?.slug ? '#d946ef33' : 'transparent' }}
                  >
                    {o.name} <span style={{ opacity: 0.5, fontSize: 11 }}>· {o.plan}</span>
                  </Link>
                ))}
                <Link
                  href="/signup" onClick={() => setOrgMenuOpen(false)}
                  style={{ display: 'block', padding: 8, borderRadius: 6, fontSize: 13, color: '#10b981', textDecoration: 'none', borderTop: '1px solid #3f3f46', marginTop: 4 }}
                >
                  + Nouvelle organisation
                </Link>
              </div>
            )}
          </div>
        )}

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem href="/dashboard" label="🏠 Accueil" active={path === '/dashboard'} />
          {currentOrg && <>
            <NavItem href={`/dashboard/orgs/${currentOrg.slug}`} label="📁 Sites" active={path.startsWith(`/dashboard/orgs/${currentOrg.slug}`) && !path.includes('/templates') && !path.includes('/settings') && !path.includes('/team') && !path.includes('/billing')} />
            <NavItem href={`/dashboard/orgs/${currentOrg.slug}/templates`} label="✨ Templates" active={path.includes('/templates')} />
            <NavItem href={`/dashboard/orgs/${currentOrg.slug}/team`} label="👥 Équipe" active={path.includes('/team')} />
            <NavItem href={`/dashboard/orgs/${currentOrg.slug}/billing`} label="💳 Facturation" active={path.includes('/billing')} />
            <NavItem href={`/dashboard/orgs/${currentOrg.slug}/settings`} label="⚙ Paramètres" active={path.includes('/settings')} />
          </>}
        </nav>

        <div style={{ borderTop: '1px solid #27272a', paddingTop: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.5, padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ width: '100%', background: 'transparent', border: 0, color: '#a1a1aa', fontSize: 13, padding: 8, cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}
          >
            ↩ Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>{children}</main>
    </div>
  );
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block', padding: '8px 12px', borderRadius: 8, fontSize: 14, textDecoration: 'none',
        color: active ? '#d946ef' : '#a1a1aa',
        background: active ? '#d946ef15' : 'transparent',
        fontWeight: active ? 600 : 400,
      }}
    >{label}</Link>
  );
}
