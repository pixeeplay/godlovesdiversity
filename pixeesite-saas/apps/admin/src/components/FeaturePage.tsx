'use client';
import { SimpleOrgPage, card } from './SimpleOrgPage';
import { gradients, colors } from '@/lib/design-tokens';

export interface FeatureCard {
  title: string; icon?: string; description?: string;
  borderColor?: string; accentColor?: string;
  bullets?: { label: string; items: string[] }[];
  cta?: { label: string; href?: string; onClick?: () => void };
  badge?: string;
}

/**
 * Page generic style "VS Code online" : banner gradient + grille de cards
 * avec border top colorée, sections + et –.
 */
export function FeaturePage({
  orgSlug, emoji, title, desc, banner, intro, cards, footer,
}: {
  orgSlug: string;
  emoji: string;
  title: string;
  desc?: string;
  banner?: string; // gradient override
  intro?: React.ReactNode;
  cards: FeatureCard[];
  footer?: React.ReactNode;
}) {
  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji={emoji} title={title} desc={desc}>
      {intro && (
        <div style={{ ...card, padding: 16, marginBottom: 16, background: `${colors.primary}08`, border: `1px solid ${colors.primary}33` }}>
          {intro}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
        {cards.map((c, i) => (
          <article key={i} style={{
            ...card, padding: 0, overflow: 'hidden',
            borderTop: `3px solid ${c.borderColor || colors.primary}`,
          }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                {c.icon && (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${c.accentColor || c.borderColor || colors.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {c.icon}
                  </div>
                )}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{c.title}</h3>
                  {c.badge && (
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: `${c.accentColor || c.borderColor || colors.primary}22`, color: c.accentColor || c.borderColor || colors.primary, fontWeight: 800 }}>{c.badge}</span>
                  )}
                </div>
              </div>
              {c.description && (
                <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 12px', lineHeight: 1.5 }}>{c.description}</p>
              )}
              {c.bullets && c.bullets.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 8 }}>
                  {c.bullets.map((b, bi) => (
                    <div key={bi}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: c.accentColor || c.borderColor || colors.primary, textTransform: 'uppercase', marginBottom: 4 }}>
                        {b.label}
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11, opacity: 0.7, lineHeight: 1.6 }}>
                        {b.items.map((it, ii) => <li key={ii}>· {it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              {c.cta && (
                <div style={{ marginTop: 12 }}>
                  {c.cta.href ? (
                    <a href={c.cta.href} target={c.cta.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      style={{ background: c.accentColor || c.borderColor || colors.primary, color: 'white', padding: '8px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      ↗ {c.cta.label}
                    </a>
                  ) : (
                    <button onClick={c.cta.onClick}
                      style={{ background: c.accentColor || c.borderColor || colors.primary, color: 'white', padding: '8px 14px', borderRadius: 8, border: 0, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      {c.cta.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
    </SimpleOrgPage>
  );
}
