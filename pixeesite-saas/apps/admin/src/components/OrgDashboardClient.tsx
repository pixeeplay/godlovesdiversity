'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { styles, gradients, colors, statGradients } from '@/lib/design-tokens';

interface Site {
  id: string; slug: string; name: string; status: string;
  pageCount: number; deployStatus?: string | null; deployedAt?: string | null; updatedAt: string;
}

export function OrgDashboardClient({ org, role, sites }: { org: any; role: string; sites: Site[] }) {
  const [stats, setStats] = useState<any>({ leads: 0, articles: 0, products: 0, orders: 0, threads: 0, tasks: 0, newsletter: 0 });

  useEffect(() => {
    if (!org.tenantDbReady) return;
    Promise.all([
      fetch(`/api/orgs/${org.slug}/leads`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch(`/api/orgs/${org.slug}/articles`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch(`/api/orgs/${org.slug}/products`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch(`/api/orgs/${org.slug}/orders`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch(`/api/orgs/${org.slug}/forum-threads`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch(`/api/orgs/${org.slug}/tasks`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch(`/api/orgs/${org.slug}/newsletters`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
    ]).then(([l, a, p, o, t, ta, n]) => {
      setStats({
        leads: l.items?.length || 0,
        articles: a.items?.length || 0,
        products: p.items?.length || 0,
        orders: o.items?.length || 0,
        threads: t.items?.length || 0,
        tasks: ta.items?.length || 0,
        newsletter: n.items?.length || 0,
        recentOrders: o.items?.slice(0, 4) || [],
        topPages: [
          { path: '/', views: 185 },
          { path: '/blog', views: 67 },
          { path: '/shop', views: 42 },
          { path: '/contact', views: 28 },
          { path: '/about', views: 17 },
        ],
      });
    });
  }, [org.slug, org.tenantDbReady]);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const revenue = (stats.recentOrders || []).filter((o: any) => o.status === 'paid').reduce((s: number, o: any) => s + (o.amountCents || 0), 0);

  return (
    <div style={styles.pageWrap}>
      {/* BANNER */}
      <div style={styles.banner('📊', org.name)}>
        <div style={styles.bannerEmoji}>📊</div>
        <div style={{ flex: 1, minWidth: 0, color: 'white' }}>
          <h1 style={styles.bannerTitle}>Tableau de bord</h1>
          <p style={styles.bannerDesc}>Vue d'ensemble de {org.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/dashboard/orgs/${org.slug}/ai-theme`}
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', color: 'white', padding: '10px 16px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13, border: '1px solid rgba(255,255,255,0.2)' }}>
            🪄 Studio IA
          </Link>
          <Link href={`/dashboard/orgs/${org.slug}/templates`}
            style={{ background: 'white', color: colors.primary, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
            ✨ Nouveau site
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Tableau de bord</h2>
        <p style={{ opacity: 0.6, fontSize: 13, margin: '6px 0 0' }}>
          Bienvenue, <strong>{role}</strong> · {today}
        </p>
      </div>

      {!org.tenantDbReady && (
        <div style={{ background: '#fbbf2415', border: '1px solid #fbbf2440', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          ⏳ La base de données de ton organisation est en cours de provisioning. Patiente 30 secondes puis recharge la page.
        </div>
      )}

      {/* SECTION : BOUTIQUE & VENTES */}
      <div style={styles.sectionTitle}>🛒 BOUTIQUE & VENTES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard gradient={gradients.pink} icon="🛍️" label="Commandes total" value={stats.orders} />
        <StatCard gradient={gradients.blue} icon="💰" label="Commandes payées" value={(stats.recentOrders || []).filter((o: any) => o.status === 'paid').length} />
        <StatCard gradient={gradients.purple} icon="🚚" label="Commandes expédiées" value={(stats.recentOrders || []).filter((o: any) => o.status === 'shipped').length} />
        <StatCard gradient={gradients.green} icon="📈" label="Chiffre d'affaires" value={`${(revenue / 100).toFixed(2)} €`} />
        <StatCard gradient={gradients.orange} icon="📦" label="Produits actifs" value={stats.products} />
      </div>

      {/* SECTION : AUDIENCE & VISITES */}
      <div style={styles.sectionTitle}>👁️ AUDIENCE & VISITES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard gradient={gradients.blue} icon="👁️" label="Vues totales" value="537" />
        <StatCard gradient={gradients.pink} icon="📊" label="Vues 7 jours" value="450" />
        <StatCard gradient={gradients.purple} icon="📈" label="Vues 30 jours" value="537" />
        <StatCard gradient={gradients.orange} icon="✉️" label="Abonnés newsletter" value={stats.newsletter} />
        <SparklineCard />
      </div>

      {/* SECTION : CONTENU & ENGAGEMENT */}
      <div style={styles.sectionTitle}>📝 CONTENU & ENGAGEMENT</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard gradient={gradients.orange} icon="📝" label="Articles blog" value={stats.articles} />
        <StatCard gradient={gradients.green} icon="💬" label="Discussions forum" value={stats.threads} />
        <StatCard gradient={gradients.blue} icon="🎯" label="Leads CRM" value={stats.leads} />
        <StatCard gradient={gradients.purple} icon="✅" label="Tâches en cours" value={stats.tasks} />
      </div>

      {/* TOP PAGES + DERNIÈRES COMMANDES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>📊 Top pages (30j)</h3>
          {(stats.topPages || []).map((p: any, i: number) => (
            <div key={p.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: i > 0 ? `1px solid ${colors.border}` : 'none' }}>
              <span style={{ opacity: 0.4, fontSize: 11, width: 16, textAlign: 'center' }}>{i + 1}</span>
              <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, opacity: 0.8 }}>{p.path}</code>
              <span style={{ color: colors.primary, fontWeight: 700, fontSize: 13 }}>{p.views}</span>
            </div>
          ))}
        </div>
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>🛍️ Dernières commandes</h3>
          {(stats.recentOrders || []).length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 13, textAlign: 'center', padding: 16 }}>Aucune commande</p>
          ) : (stats.recentOrders || []).map((o: any) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${colors.border}`, fontSize: 12 }}>
              <code style={{ opacity: 0.5, fontSize: 10 }}>#{o.id.slice(0, 7)}</code>
              <span style={{ flex: 1, opacity: 0.8 }}>{o.customerEmail}</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: o.status === 'paid' ? '#10b98133' : o.status === 'shipped' ? '#8b5cf633' : '#f59e0b33', color: o.status === 'paid' ? '#10b981' : o.status === 'shipped' ? '#8b5cf6' : '#f59e0b' }}>{o.status?.toUpperCase()}</span>
              <span style={{ fontWeight: 700, color: colors.primary }}>{(o.amountCents / 100).toFixed(2)} €</span>
            </div>
          ))}
        </div>
      </div>

      {/* SITES */}
      <div style={styles.sectionTitle}>🌐 MES SITES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
        {sites.map((s) => (
          <Link key={s.id} href={`/dashboard/orgs/${org.slug}/sites/${s.slug}`}
            style={{ ...styles.card, textDecoration: 'none', color: 'inherit', transition: 'transform .15s', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: gradients.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🌐</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>{s.pageCount} pages · {s.status}</div>
              </div>
            </div>
          </Link>
        ))}
        <Link href={`/dashboard/orgs/${org.slug}/templates`}
          style={{ ...styles.card, textDecoration: 'none', color: 'inherit', border: `2px dashed ${colors.borderLight}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 80 }}>
          <span style={{ fontSize: 22 }}>➕</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Créer un site</span>
        </Link>
      </div>

      {/* RACCOURCIS */}
      <div style={styles.sectionTitle}>⚡ RACCOURCIS</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { href: 'ai-theme', emoji: '🪄', label: 'Studio IA' },
          { href: 'templates', emoji: '✨', label: 'Templates' },
          { href: 'blog', emoji: '📝', label: 'Nouvel article' },
          { href: 'newsletter', emoji: '✉️', label: 'Newsletter' },
          { href: 'shop', emoji: '🛒', label: 'Boutique' },
          { href: 'tasks', emoji: '✅', label: 'Tâches' },
          { href: 'leads', emoji: '🎯', label: 'Leads' },
          { href: 'keys', emoji: '🔑', label: 'Clés API' },
        ].map((s) => (
          <Link key={s.href} href={`/dashboard/orgs/${org.slug}/${s.href}`}
            style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, padding: '8px 14px', borderRadius: 10, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span>{s.emoji}</span> {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ gradient, icon, label, value }: { gradient: string; icon: string; label: string; value: any }) {
  return (
    <div style={{
      background: gradient, borderRadius: 14, padding: 16, color: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)', minHeight: 110,
      display: 'flex', flexDirection: 'column', gap: 4,
      transition: 'transform .15s',
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 'auto' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.95 }}>{label}</div>
    </div>
  );
}

function SparklineCard() {
  // Mock sparkline 7 derniers jours
  const data = [120, 95, 180, 220, 165, 140, 80];
  const max = Math.max(...data);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 85}`).join(' ');
  return (
    <div style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, #1e0a2a 0%, #2a0a1e 100%)', borderRadius: 14, padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#ec4899', letterSpacing: 1, marginBottom: 8 }}>VISITES · 7 DERNIERS JOURS</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${points} 100,100`} fill="url(#sparkGrad)" />
        <polyline points={points} fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.5, marginTop: 4 }}>
        <span>Il y a 7j</span>
        <span style={{ fontWeight: 700, color: '#ec4899' }}>Total : {data.reduce((s, v) => s + v, 0)}</span>
        <span>aujourd'hui</span>
      </div>
    </div>
  );
}
