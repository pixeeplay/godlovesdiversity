import Link from 'next/link';

export function PublicShell({ org, children }: { org: any; children: React.ReactNode }) {
  const primary = org?.primaryColor || '#d946ef';
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fafafa', fontFamily: `${org?.font || 'Inter'}, -apple-system, system-ui, sans-serif` }}>
      <header style={{
        borderBottom: '1px solid #27272a', padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 24,
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(16px)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          {org?.logoUrl
            ? <img src={org.logoUrl} alt={org.name} style={{ height: 28 }} />
            : <>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${primary}, #06b6d4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'white' }}>
                  {org?.name?.slice(0, 2).toUpperCase() || '✨'}
                </div>
                <span style={{ fontWeight: 800, fontSize: 17 }}>{org?.name || 'Site'}</span>
              </>
          }
        </Link>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto', fontSize: 14 }}>
          <NavLink href="/" label="Accueil" />
          <NavLink href="/blog" label="Blog" />
          <NavLink href="/forum" label="Forum" />
          <NavLink href="/shop" label="Boutique" />
          <NavLink href="/contact" label="Contact" />
        </nav>
      </header>
      <main>{children}</main>
      <footer style={{
        borderTop: '1px solid #27272a', padding: '32px 24px',
        marginTop: 64, textAlign: 'center', fontSize: 12, opacity: 0.5,
        background: 'linear-gradient(180deg, transparent 0%, #0d0d12 100%)',
      }}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/blog" style={{ color: 'inherit', margin: '0 12px' }}>Blog</Link>
          <Link href="/forum" style={{ color: 'inherit', margin: '0 12px' }}>Forum</Link>
          <Link href="/shop" style={{ color: 'inherit', margin: '0 12px' }}>Boutique</Link>
          <Link href="/contact" style={{ color: 'inherit', margin: '0 12px' }}>Contact</Link>
        </div>
        © {new Date().getFullYear()} {org?.name} · Propulsé par <a href="https://pixeesite.com" style={{ color: primary }}>Pixeesite</a>
      </footer>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ color: '#a1a1aa', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, transition: 'background .15s, color .15s' }}>
      {label}
    </Link>
  );
}
