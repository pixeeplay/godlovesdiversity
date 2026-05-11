'use client';
import Link from 'next/link';
import { ReactNode } from 'react';
import { colors, gradients, styles as dtStyles } from '@/lib/design-tokens';

/**
 * Page admin générique réutilisable. Layout uniforme avec banner gradient +
 * titre + description + content. Style "gld-like".
 */
export function SimpleOrgPage({
  orgSlug, emoji, title, desc, children, actions
}: {
  orgSlug: string;
  emoji: string;
  title: string;
  desc?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Banner gradient */}
      <div style={dtStyles.banner(emoji, title)}>
        <div style={dtStyles.bannerEmoji}>{emoji}</div>
        <div style={{ flex: 1, minWidth: 0, color: 'white' }}>
          <h1 style={dtStyles.bannerTitle}>{title}</h1>
          {desc && <p style={dtStyles.bannerDesc}>{desc}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 12, opacity: 0.5 }}>
        <Link href={`/dashboard/orgs/${orgSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>← Mon organisation</Link>
      </div>

      {children}
    </div>
  );
}

export const btnPrimary: React.CSSProperties = {
  background: gradients.brand,
  color: 'white', border: 0,
  padding: '10px 16px', borderRadius: 10,
  fontWeight: 700, cursor: 'pointer',
  textDecoration: 'none', display: 'inline-block', fontSize: 13,
  boxShadow: '0 4px 12px rgba(217,70,239,0.3)',
};
export const btnSecondary: React.CSSProperties = {
  background: colors.bgCard, color: 'inherit',
  border: `1px solid ${colors.borderLight}`,
  padding: '10px 16px', borderRadius: 10,
  fontWeight: 600, cursor: 'pointer',
  textDecoration: 'none', display: 'inline-block', fontSize: 13,
};
export const card: React.CSSProperties = {
  background: colors.bgCard, border: `1px solid ${colors.border}`,
  borderRadius: 14, padding: 16,
};
export const input: React.CSSProperties = {
  width: '100%', padding: 10, background: '#0a0a0f',
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 8, color: 'inherit', fontSize: 13,
  fontFamily: 'inherit',
};
