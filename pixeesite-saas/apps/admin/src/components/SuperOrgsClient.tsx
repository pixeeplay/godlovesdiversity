'use client';
import { useEffect, useState } from 'react';
import { card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import Link from 'next/link';

const PLANS = ['free', 'solo', 'pro', 'agency', 'enterprise'];

export function SuperOrgsClient() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/admin/orgs${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    const j = await r.json();
    setOrgs(j.orgs || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [q]);

  async function changePlan(id: string, plan: string) {
    await fetch('/api/admin/orgs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plan }),
    });
    load();
  }

  async function patch(id: string, data: any) {
    await fetch('/api/admin/orgs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    load();
  }

  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  async function migrateTenants() {
    setMigrating(true);
    setMigrateResult(null);
    const r = await fetch('/api/admin/migrate-tenants', { method: 'POST' });
    const j = await r.json();
    setMigrateResult(`Migré ${j.migrated}/${j.total}`);
    setMigrating(false);
    load();
  }

  // Phase 20 — Seed marketplace templates (11 themed templates)
  const [seedingMarketplace, setSeedingMarketplace] = useState(false);
  const [seedMarketplaceResult, setSeedMarketplaceResult] = useState<string | null>(null);
  async function seedMarketplace() {
    setSeedingMarketplace(true);
    setSeedMarketplaceResult(null);
    try {
      const r = await fetch('/api/admin/seed-marketplace-templates', { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        setSeedMarketplaceResult(
          `OK · ${j.created} créés, ${j.updated} mis à jour (${j.total})`
        );
      } else {
        setSeedMarketplaceResult(
          `Partiel : ${j.created || 0} créés, ${j.updated || 0} màj, ${(j.errors || []).length} erreurs`
        );
      }
    } catch (e: any) {
      setSeedMarketplaceResult(`Erreur : ${e.message}`);
    }
    setSeedingMarketplace(false);
  }

  const [initOrg, setInitOrg] = useState<string | null>(null);
  const [initLog, setInitLog] = useState<any[]>([]);
  const [initBusy, setInitBusy] = useState(false);
  async function initTenant(orgSlug: string) {
    setInitOrg(orgSlug);
    setInitLog([{ step: 'starting', ok: true, detail: 'Création tables SQL + pages depuis templates…' }]);
    setInitBusy(true);
    try {
      const r = await fetch(`/api/admin/init-tenant?org=${orgSlug}`, { method: 'POST' });
      const j = await r.json();
      setInitLog(j.log || [{ step: 'no-response', ok: false }]);
    } catch (e: any) {
      setInitLog([{ step: 'error', ok: false, detail: e.message }]);
    }
    setInitBusy(false);
    load();
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>🏢 Toutes les organisations</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={migrateTenants} disabled={migrating} style={btnSecondary} title="Push tenant.prisma sur toutes les DBs tenants">
            {migrating ? '⏳ Migration…' : '🔧 Migrate tenants'}
          </button>
          {migrateResult && <span style={{ fontSize: 12, color: '#10b981' }}>{migrateResult}</span>}
          <button onClick={seedMarketplace} disabled={seedingMarketplace} style={btnSecondary} title="Phase 20 — Upsert les 11 templates thémés de la marketplace (Photo, Restau, Coach, Podcast, Asso, École, Agence, Immo, E-com, Link, Blog)">
            {seedingMarketplace ? '⏳ Seed…' : '📦 Seed marketplace'}
          </button>
          {seedMarketplaceResult && <span style={{ fontSize: 12, color: seedMarketplaceResult.startsWith('OK') ? '#10b981' : '#f59e0b' }}>{seedMarketplaceResult}</span>}
          <input style={{ ...input, maxWidth: 280 }} placeholder="Rechercher slug ou nom…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ ...card, padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0a0f' }}>
                <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Org</th>
                <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Owner</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>Sites</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>Membres</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>DB</th>
                <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Plan</th>
                <th style={{ textAlign: 'right', padding: 10, opacity: 0.6 }}>Créé</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid #27272a' }}>
                  <td style={{ padding: 10 }}>
                    <Link href={`/dashboard/orgs/${o.slug}`} style={{ color: '#d946ef', textDecoration: 'none', fontWeight: 600 }}>
                      {o.name}
                    </Link>
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{o.slug}</div>
                  </td>
                  <td style={{ padding: 10, fontSize: 12, opacity: 0.7 }}>{o.owner?.email}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>{o._count?.sites || 0}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>{o._count?.members || 0}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>{o.tenantDbReady ? '🟢' : '🟡'}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <select value={o.plan} onChange={(e) => changePlan(o.id, e.target.value)}
                        style={{ ...input, width: 120, padding: 6, fontSize: 12 }}>
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button onClick={() => patch(o.id, { plan: 'agency', maxSites: 999, maxAiCredits: 999999, tenantDbReady: true, planStatus: 'active' })}
                          title="Débloque tout : plan AGENCY + 999 sites + 999k crédits IA + tenant ready + status active"
                          style={{ ...input, fontSize: 10, padding: '2px 6px', cursor: 'pointer', background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}>
                          ∞ Unlock AGENCY
                        </button>
                        <button onClick={() => initTenant(o.slug)} disabled={initBusy}
                          title="Crée les 10 tables tenant manquantes via SQL + recrée pages depuis templates"
                          style={{ ...input, fontSize: 10, padding: '2px 6px', cursor: 'pointer', background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644' }}>
                          🔧 Init tenant
                        </button>
                        <button onClick={async () => {
                          if (!confirm(`Publier TOUS les sites en draft de "${o.slug}" ?`)) return;
                          const r = await fetch(`/api/admin/publish-all-sites?org=${o.slug}`, { method: 'POST' });
                          const j = await r.json();
                          alert(j.ok ? `${j.updated} site(s) publié(s) (total ${j.published}/${j.total})` : `Erreur : ${j.error}`);
                          load();
                        }} title="Met tous les sites en draft en status='published' (rattrapage anciens sites)"
                          style={{ ...input, fontSize: 10, padding: '2px 6px', cursor: 'pointer', background: '#d946ef22', color: '#d946ef', border: '1px solid #d946ef44' }}>
                          📢 Publish all
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: 10, fontSize: 11, opacity: 0.5 }}>
                    {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>Aucune org</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
