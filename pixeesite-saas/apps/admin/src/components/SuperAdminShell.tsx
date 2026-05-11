'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { colors, gradients } from '@/lib/design-tokens';

const items = [
  { href: '/admin', icon: '📊', label: 'Dashboard' },
  { href: '/admin/orgs', icon: '🏢', label: 'Organisations' },
  { href: '/admin/users', icon: '👥', label: 'Utilisateurs' },
  { href: '/admin/secrets', icon: '🔑', label: 'Secrets plateforme' },
  { href: '/admin/ai', icon: '🤖', label: 'IA usage' },
  { href: '/admin/billing', icon: '💰', label: 'Revenus' },
  { href: '/admin/audit', icon: '📜', label: 'Audit log' },
];

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem('pxs.super.expanded');
    if (saved !== null) setExpanded(saved === '1');
  }, []);
  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem('pxs.super.expanded', next ? '1' : '0');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <style>{`
        .pxs-nav-item-super { transition: background .15s; position: relative; }
        .pxs-nav-item-super:hover { background: ${colors.bgCardHover} !important; }
        .pxs-nav-item-super .pxs-tooltip-super { display: none; position: absolute; left: 100%; top: 50%; transform: translateY(-50%); margin-left: 8px; background: ${colors.bgCard}; border: 1px solid ${colors.borderLight}; padding: 4px 10px; border-radius: 6px; font-size: 12px; white-space: nowrap; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .pxs-nav-item-super:hover .pxs-tooltip-super { display: block; }
      `}</style>
      <aside style={{ width: expanded ? 220 : 56, background: colors.bgCard, borderRight: `1px solid ${colors.border}`, padding: '14px 8px', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width .2s' }}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', marginBottom: 20, padding: '0 6px' }}>
          <span style={{ fontSize: 22 }}>👑</span>
          {expanded && <span style={{ fontWeight: 900, fontSize: 14, background: gradients.orange, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SuperAdmin</span>}
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
          {items.map((it) => {
            const active = path === it.href || (it.href !== '/admin' && path.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href} className="pxs-nav-item-super"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: expanded ? '8px 10px' : '10px 0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  borderRadius: 8, fontSize: 13, textDecoration: 'none',
                  color: active ? colors.warning : colors.textMuted,
                  background: active ? '#f59e0b15' : 'transparent',
                  fontWeight: active ? 700 : 500,
                }}>
                <span style={{ fontSize: 16 }}>{it.icon}</span>
                {expanded && <span style={{ flex: 1 }}>{it.label}</span>}
                {!expanded && <span className="pxs-tooltip-super">{it.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button onClick={toggleExpanded}
          style={{ width: '100%', background: 'transparent', border: 0, color: colors.textDim, fontSize: 12, padding: expanded ? '8px 10px' : '10px 0', cursor: 'pointer', textAlign: expanded ? 'left' : 'center', borderRadius: 6 }}>
          {expanded ? '◀ Réduire' : '▶'}
        </button>
        <Link href="/dashboard"
          style={{ padding: expanded ? '8px 10px' : '10px 0', borderRadius: 6, fontSize: 12, color: colors.textDim, textDecoration: 'none', borderTop: `1px solid ${colors.border}`, marginTop: 8, textAlign: expanded ? 'left' : 'center', display: expanded ? 'block' : 'flex', justifyContent: 'center' }}>
          {expanded ? '← Dashboard' : '←'}
        </Link>
      </aside>
      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
