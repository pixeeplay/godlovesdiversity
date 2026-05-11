'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { MegaSearch } from './MegaSearch';
import { ClaudeAutopilot } from './ClaudeAutopilot';
import { colors, gradients } from '@/lib/design-tokens';

interface Org { slug: string; name: string; plan: string; role: string; }

interface NavItem { href: string; icon: string; label: string; badge?: string; }
interface NavSection { title: string; emoji: string; items: NavItem[]; defaultOpen?: boolean; }

export function DashboardShell({ user, orgs, children }: { user: any; orgs: Org[]; children: React.ReactNode }) {
  const path = usePathname();
  const currentOrgSlug = path.match(/^\/dashboard\/orgs\/([^/]+)/)?.[1];
  const currentOrg = orgs.find((o) => o.slug === currentOrgSlug) || orgs[0];
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Nouveau': true, 'Boutique': false, 'Contenu': false, 'Communication': false,
    'IA & Outils': false, 'Org': false, 'Système': false,
  });
  useEffect(() => { setMobileNavOpen(false); }, [path]);

  function toggleSection(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  const slug = currentOrg?.slug;
  const sections: NavSection[] = !slug ? [] : [
    {
      title: 'Nouveau', emoji: '⭐', defaultOpen: true,
      items: [
        { href: `/dashboard/orgs/${slug}/ai-theme`, icon: '🪄', label: 'Studio IA', badge: 'HOT' },
        { href: `/dashboard/orgs/${slug}/claude-workspace`, icon: '🤖', label: 'Claude Workspace' },
        { href: `/dashboard/orgs/${slug}/vscode-online`, icon: '💻', label: 'VS Code online' },
        { href: `/dashboard/orgs/${slug}/time-machine`, icon: '⏱️', label: 'Time Machine' },
        { href: `/dashboard/orgs/${slug}/templates`, icon: '✨', label: 'Templates marketplace' },
        { href: `/dashboard/orgs/${slug}/sites`, icon: '🎨', label: 'Page Builder' },
      ],
    },
    {
      title: 'Boutique', emoji: '🛒',
      items: [
        { href: `/dashboard/orgs/${slug}/shop`, icon: '📦', label: 'Produits' },
        { href: `/dashboard/orgs/${slug}/orders`, icon: '🧾', label: 'Commandes' },
        { href: `/dashboard/orgs/${slug}/dropshipping`, icon: '📥', label: 'Dropshipping' },
      ],
    },
    {
      title: 'Contenu', emoji: '📚',
      items: [
        { href: `/dashboard/orgs/${slug}/moderation`, icon: '🛡️', label: 'Modération' },
        { href: `/dashboard/orgs/${slug}/bulk-import`, icon: '📤', label: 'Import en masse' },
        { href: `/dashboard/orgs/${slug}/map`, icon: '🗺️', label: 'Carte mondiale' },
        { href: `/dashboard/orgs/${slug}/posters`, icon: '🖼️', label: 'Affiches' },
        { href: `/dashboard/orgs/${slug}/news`, icon: '📰', label: 'Actualités' },
        { href: `/dashboard/orgs/${slug}/events`, icon: '📅', label: 'Événements' },
        { href: `/dashboard/orgs/${slug}/forum`, icon: '💬', label: 'Forum' },
        { href: `/dashboard/orgs/${slug}/testimonials`, icon: '🎥', label: 'Témoignages vidéo' },
        { href: `/dashboard/orgs/${slug}/coupons`, icon: '🎟️', label: 'Coupons & promos' },
        { href: `/dashboard/orgs/${slug}/youtube`, icon: '▶️', label: 'Vidéos YouTube' },
        { href: `/dashboard/orgs/${slug}/banners`, icon: '🎴', label: 'Bannières hero' },
        { href: `/dashboard/orgs/${slug}/sitemap`, icon: '🧭', label: 'Sitemap' },
      ],
    },
    {
      title: 'Communication', emoji: '✉️',
      items: [
        { href: `/dashboard/orgs/${slug}/newsletter`, icon: '📬', label: 'Newsletter' },
        { href: `/dashboard/orgs/${slug}/newsletter-plan`, icon: '🗓️', label: 'Plan newsletter annuel' },
        { href: `/dashboard/orgs/${slug}/social-calendar`, icon: '📆', label: 'Calendrier social' },
        { href: `/dashboard/orgs/${slug}/blog`, icon: '📝', label: 'Blog' },
        { href: `/dashboard/orgs/${slug}/pages`, icon: '📄', label: 'Pages riches' },
        { href: `/dashboard/orgs/${slug}/partners`, icon: '🤝', label: 'Partenaires' },
        { href: `/dashboard/orgs/${slug}/mail`, icon: '📨', label: 'Webmail IMAP' },
        { href: `/dashboard/orgs/${slug}/forms`, icon: '📋', label: 'Formulaires' },
      ],
    },
    {
      title: 'CRM & Leads', emoji: '🎯',
      items: [
        { href: `/dashboard/orgs/${slug}/leads`, icon: '🎯', label: 'Leads CRM' },
        { href: `/dashboard/orgs/${slug}/scraper`, icon: '🕷️', label: 'Scraper leads' },
        { href: `/dashboard/orgs/${slug}/email-templates`, icon: '📧', label: 'Templates emails' },
        { href: `/dashboard/orgs/${slug}/tasks`, icon: '✅', label: 'Tâches board' },
      ],
    },
    {
      title: 'IA & Outils', emoji: '✨',
      items: [
        { href: `/dashboard/orgs/${slug}/ai`, icon: '🤖', label: 'AI Settings multi-providers' },
        { href: `/dashboard/orgs/${slug}/ai-autopilot`, icon: '🚁', label: 'AI Autopilot' },
        { href: `/dashboard/orgs/${slug}/manuals`, icon: '📗', label: 'Manuels auto IA' },
        { href: `/dashboard/orgs/${slug}/rag`, icon: '🧠', label: 'Cerveau RAG' },
        { href: `/dashboard/orgs/${slug}/brain-3d`, icon: '🌐', label: 'Brain 3D' },
        { href: `/dashboard/orgs/${slug}/playground`, icon: '🎮', label: 'Playground RAG' },
        { href: `/dashboard/orgs/${slug}/legal-assistant`, icon: '⚖️', label: 'Assistant juridique' },
        { href: `/dashboard/orgs/${slug}/avatar-studio`, icon: '🎭', label: 'Avatar Studio (vidéo)' },
        { href: `/dashboard/orgs/${slug}/translations`, icon: '🌍', label: 'Traductions IA' },
        { href: `/dashboard/orgs/${slug}/telegram-bot`, icon: '🤳', label: 'Bot Telegram' },
        { href: `/dashboard/orgs/${slug}/integrations`, icon: '🔌', label: 'Intégrations' },
        { href: `/dashboard/orgs/${slug}/themes`, icon: '🎨', label: 'Thèmes saisonniers' },
        { href: `/dashboard/orgs/${slug}/feature-flags`, icon: '🚦', label: 'Feature flags' },
      ],
    },
    {
      title: 'Org & Système', emoji: '⚙️',
      items: [
        { href: `/dashboard/orgs/${slug}/team`, icon: '👥', label: 'Équipe' },
        { href: `/dashboard/orgs/${slug}/billing`, icon: '💳', label: 'Facturation' },
        { href: `/dashboard/orgs/${slug}/domains`, icon: '🌐', label: 'Domaines' },
        { href: `/dashboard/orgs/${slug}/keys`, icon: '🔑', label: 'Clés API' },
        { href: `/dashboard/orgs/${slug}/security`, icon: '🔐', label: 'Sécurité 2FA' },
        { href: `/dashboard/orgs/${slug}/menu`, icon: '☰', label: 'Menu nav' },
        { href: `/dashboard/orgs/${slug}/menu-visibility`, icon: '👁️', label: 'Visibilité menu' },
        { href: `/dashboard/orgs/${slug}/users`, icon: '👤', label: 'Utilisateurs' },
        { href: `/dashboard/orgs/${slug}/settings`, icon: '⚙️', label: 'Paramètres' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="pxs-burger"
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 60, background: colors.bgCard, color: 'white', border: `1px solid ${colors.border}`, borderRadius: 8, width: 40, height: 40, cursor: 'pointer', fontSize: 18, display: 'none' }}>
        {mobileNavOpen ? '✕' : '☰'}
      </button>
      <style>{`
        @media (max-width: 768px) {
          .pxs-burger { display: block !important; }
          .pxs-sidebar { position: fixed !important; left: ${mobileNavOpen ? '0' : '-280px'} !important; top: 0; bottom: 0; transition: left .25s; z-index: 50; box-shadow: 4px 0 16px rgba(0,0,0,0.6); }
          .pxs-main { padding: 56px 12px 12px !important; }
        }
        .pxs-nav-item { transition: background .15s; }
        .pxs-nav-item:hover { background: ${colors.bgCardHover} !important; }
        .pxs-section-btn { transition: background .15s; }
        .pxs-section-btn:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      {/* Sidebar */}
      <aside className="pxs-sidebar" style={{ width: 250, background: colors.bgCard, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '14px 12px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/dashboard" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: gradients.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎨</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1, background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pixeesite</div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Admin</div>
            </div>
          </Link>
          {slug && (
            <a href={`https://${slug}.pixeeplay.com`} target="_blank" rel="noopener noreferrer"
              style={{ background: '#0a0a0f', border: `1px solid ${colors.border}`, padding: '4px 8px', borderRadius: 6, fontSize: 10, color: colors.textMuted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              title={`Voir le site public ${slug}.pixeeplay.com`}
            >🏠 FRONT</a>
          )}
        </div>

        {/* Org switcher + Dashboard pinned */}
        {orgs.length > 0 && (
          <div style={{ padding: '10px 8px' }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <button onClick={() => setOrgMenuOpen(!orgMenuOpen)}
                style={{ width: '100%', background: '#0a0a0f', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 8, color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: gradients.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                  {currentOrg?.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentOrg?.name}</div>
                  <div style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase' }}>{currentOrg?.plan} · {currentOrg?.role}</div>
                </div>
                <span style={{ opacity: 0.5, fontSize: 10 }}>▾</span>
              </button>
              {orgMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#0a0a0f', border: `1px solid ${colors.borderLight}`, borderRadius: 10, padding: 4, zIndex: 20, boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
                  {orgs.map((o) => (
                    <Link key={o.slug} href={`/dashboard/orgs/${o.slug}`} onClick={() => setOrgMenuOpen(false)}
                      style={{ display: 'block', padding: 8, borderRadius: 6, fontSize: 12, color: 'inherit', textDecoration: 'none', background: o.slug === currentOrg?.slug ? '#d946ef22' : 'transparent' }}>
                      {o.name} <span style={{ opacity: 0.5, fontSize: 10 }}>· {o.plan}</span>
                    </Link>
                  ))}
                  <Link href="/signup" onClick={() => setOrgMenuOpen(false)}
                    style={{ display: 'block', padding: 8, borderRadius: 6, fontSize: 12, color: colors.success, textDecoration: 'none', borderTop: `1px solid ${colors.border}`, marginTop: 4 }}>
                    + Nouvelle org
                  </Link>
                </div>
              )}
            </div>

            {/* Dashboard pinned */}
            {slug && (
              <Link href={`/dashboard/orgs/${slug}`} className="pxs-nav-item"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  borderRadius: 10, fontSize: 13, textDecoration: 'none',
                  color: path === `/dashboard/orgs/${slug}` ? colors.primary : colors.text,
                  background: path === `/dashboard/orgs/${slug}` ? `${colors.primary}22` : `${colors.primary}11`,
                  fontWeight: 700, border: `1px solid ${path === `/dashboard/orgs/${slug}` ? colors.primary : colors.primary + '33'}`,
                }}>
                <span style={{ fontSize: 15 }}>📊</span>
                <span>Tableau de bord</span>
              </Link>
            )}
          </div>
        )}

        {/* Sections */}
        <nav style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
          {sections.map((sec) => {
            const isOpen = openSections[sec.title] ?? sec.defaultOpen ?? false;
            const sectionHasActive = sec.items.some((it) => path === it.href || path.startsWith(it.href + '/'));
            return (
              <div key={sec.title} style={{ marginBottom: 6 }}>
                <button onClick={() => toggleSection(sec.title)} className="pxs-section-btn"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8,
                    background: 'transparent', border: 0, color: sectionHasActive ? colors.primary : colors.text,
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 14 }}>{sec.emoji}</span>
                  <span style={{ flex: 1 }}>{sec.title}</span>
                  <span style={{ opacity: 0.5, fontSize: 10, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }}>▾</span>
                </button>
                {isOpen && (
                  <div style={{ paddingLeft: 8, borderLeft: `1px solid ${colors.border}`, marginLeft: 14, paddingTop: 2 }}>
                    {sec.items.map((it) => {
                      const active = path === it.href;
                      return (
                        <Link key={it.href} href={it.href} className="pxs-nav-item"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                            borderRadius: 7, fontSize: 12, textDecoration: 'none',
                            color: active ? colors.primary : colors.textMuted,
                            background: active ? '#d946ef15' : 'transparent',
                            fontWeight: active ? 700 : 500,
                          }}>
                          <span style={{ fontSize: 13 }}>{it.icon}</span>
                          <span style={{ flex: 1 }}>{it.label}</span>
                          {it.badge && (
                            <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: colors.danger, color: 'white', fontWeight: 800 }}>{it.badge}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: '10px 8px' }}>
          {user?.isSuperAdmin && (
            <Link href="/admin"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, color: colors.warning, textDecoration: 'none', borderRadius: 6, fontWeight: 700, background: '#f59e0b15' }}>
              <span>👑</span>
              <span>Super-admin</span>
            </Link>
          )}
          <div style={{ fontSize: 10, opacity: 0.5, padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ width: '100%', background: 'transparent', border: 0, color: colors.textDim, fontSize: 12, padding: '6px 10px', cursor: 'pointer', textAlign: 'left', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>↩</span><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="pxs-main" style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div style={{ marginBottom: 20 }}>
          <MegaSearch orgSlug={currentOrg?.slug} />
        </div>
        {children}
      </main>

      {/* Claude AI Autopilot bottom-sheet (⌘J pour ouvrir) */}
      <ClaudeAutopilot orgSlug={currentOrg?.slug} />
    </div>
  );
}
