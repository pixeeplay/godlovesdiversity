'use client';
import { useState } from 'react';
import { SimpleOrgPage, card, btnPrimary, btnSecondary } from './SimpleOrgPage';

const PLANS = [
  { id: 'free',   name: 'Free',    price: 0,    sites: 1,  storage: '100 MB', ai: 50,    features: ['1 site', '100 MB storage', '50 AI credits/mo'] },
  { id: 'solo',   name: 'Solo',    price: 14,   sites: 1,  storage: '5 GB',   ai: 500,   features: ['1 site', '5 GB storage', '500 AI credits/mo', '1 custom domain'] },
  { id: 'pro',    name: 'Pro',     price: 39,   sites: 3,  storage: '20 GB',  ai: 2000,  features: ['3 sites', '20 GB storage', '2000 AI credits/mo', '∞ custom domains', 'A/B Test', 'Code export'] },
  { id: 'agency', name: 'Agency',  price: 99,   sites: 25, storage: '100 GB', ai: 10000, features: ['25 sites', '100 GB storage', '10000 AI credits/mo', '∞ custom domains', '10 team members'] },
];

export function BillingClient({ orgSlug, role, org, invoices }: { orgSlug: string; role: string; org: any; invoices: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function upgrade(plan: string) {
    setLoading(plan);
    const r = await fetch(`/api/orgs/${orgSlug}/billing/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const j = await r.json();
    setLoading(null);
    if (j.url) window.location.href = j.url;
    else alert('Erreur : ' + (j.error || 'Stripe non configuré'));
  }

  async function openPortal() {
    setLoading('portal');
    const r = await fetch(`/api/orgs/${orgSlug}/billing/portal`, { method: 'POST' });
    const j = await r.json();
    setLoading(null);
    if (j.url) window.location.href = j.url;
    else alert(j.error || 'Pas de Stripe customer');
  }

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="💳" title="Facturation" desc={`Plan actuel : ${org.plan?.toUpperCase()} · ${org.planStatus}`}>
      {org.subscription?.stripeCustomerId && (
        <button style={{ ...btnSecondary, marginBottom: 16 }} onClick={openPortal} disabled={loading === 'portal'}>
          {loading === 'portal' ? 'Chargement…' : '⚙ Gérer ma facturation Stripe'}
        </button>
      )}

      <h3 style={{ fontSize: 14, opacity: 0.7 }}>Choisir un plan</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {PLANS.map((p) => {
          const isCurrent = org.plan === p.id;
          return (
            <article key={p.id} style={{ ...card, position: 'relative', borderColor: isCurrent ? '#d946ef' : '#27272a' }}>
              {isCurrent && <span style={{ position: 'absolute', top: -10, right: 12, background: '#d946ef', color: 'white', padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>ACTUEL</span>}
              <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>
                {p.price === 0 ? 'Gratuit' : <>{p.price} <span style={{ fontSize: 13, opacity: 0.5 }}>€/mois</span></>}
              </div>
              <ul style={{ fontSize: 12, opacity: 0.8, padding: 0, listStyle: 'none', margin: '12px 0' }}>
                {p.features.map((f, i) => <li key={i} style={{ padding: '2px 0' }}>✓ {f}</li>)}
              </ul>
              {isCurrent ? (
                <button disabled style={{ ...btnSecondary, width: '100%', opacity: 0.5, cursor: 'default' }}>Plan actuel</button>
              ) : p.price === 0 ? (
                <button disabled style={{ ...btnSecondary, width: '100%', opacity: 0.5 }}>—</button>
              ) : (
                <button style={{ ...btnPrimary, width: '100%', opacity: loading === p.id ? 0.5 : 1 }} onClick={() => upgrade(p.id)} disabled={loading === p.id || role !== 'owner'}>
                  {loading === p.id ? 'Stripe…' : `Upgrade → ${p.name}`}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {role !== 'owner' && <p style={{ fontSize: 12, opacity: 0.5 }}>Seul l'owner peut modifier le plan.</p>}

      {invoices.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, opacity: 0.7 }}>Factures</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {invoices.map((inv: any) => (
              <div key={inv.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</span>
                <span style={{ fontWeight: 700 }}>{(inv.amountCents / 100).toFixed(2)} €</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: inv.status === 'paid' ? '#10b98122' : '#fbbf2422', color: inv.status === 'paid' ? '#10b981' : '#fbbf24' }}>{inv.status}</span>
                {inv.pdfUrl && <a href={inv.pdfUrl} target="_blank" rel="noopener" style={{ color: '#06b6d4', textDecoration: 'none', fontSize: 12 }}>PDF →</a>}
              </div>
            ))}
          </div>
        </>
      )}
    </SimpleOrgPage>
  );
}
