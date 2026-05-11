'use client';
import { useEffect, useState } from 'react';
import { gradients, styles } from '@/lib/design-tokens';

export function SuperStatsClient() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    fetch('/api/admin/stats').then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) return <p style={{ opacity: 0.5 }}>Chargement…</p>;

  const tiles = [
    { label: 'Utilisateurs', value: stats.users, emoji: '👥', gradient: gradients.pink },
    { label: 'Organisations', value: stats.orgs, emoji: '🏢', gradient: gradients.blue },
    { label: 'Sites publiés', value: stats.sites, emoji: '🌐', gradient: gradients.purple },
    { label: 'Abonnements payants', value: stats.paidSubscriptions, emoji: '💳', gradient: gradients.green },
    { label: 'Revenus cumulés', value: `${(stats.revenueCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, emoji: '💰', gradient: gradients.orange },
    { label: 'Coût IA 30j', value: `${(stats.aiCostCentsLast30 / 100).toFixed(2)} €`, emoji: '🤖', gradient: gradients.brand },
    { label: 'Tokens IA 30j', value: stats.aiTokensLast30.toLocaleString(), emoji: '🧠', gradient: gradients.pink },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={styles.banner('👑', 'Super-Admin Dashboard')}>
        <div style={styles.bannerEmoji}>👑</div>
        <div style={{ flex: 1, color: 'white' }}>
          <h1 style={styles.bannerTitle}>Super-Admin Dashboard</h1>
          <p style={styles.bannerDesc}>Vue plateforme — toutes les orgs, tous les users</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: t.gradient, borderRadius: 14, padding: 18, color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', minHeight: 120, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 22 }}>{t.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 'auto' }}>{t.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.95, marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
