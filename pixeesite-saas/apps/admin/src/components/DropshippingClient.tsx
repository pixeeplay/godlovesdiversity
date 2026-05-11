'use client';
import { useState } from 'react';
import Link from 'next/link';
import { SimpleOrgPage, card, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type ProviderKey = 'aliexpress' | 'spocket' | 'printful';

const PROVIDERS: { key: ProviderKey; emoji: string; name: string; tagline: string; desc: string; secretKeys: string[]; color: string; docs: string }[] = [
  {
    key: 'aliexpress',
    emoji: '🛍️',
    name: 'AliExpress',
    tagline: 'Catalogue 100M+ produits',
    desc: 'Import direct depuis AliExpress, markup auto, fulfill manuel ou via Open Platform API.',
    secretKeys: ['ALIEXPRESS_KEY'],
    color: '#f97316',
    docs: 'https://openservice.aliexpress.com/',
  },
  {
    key: 'spocket',
    emoji: '🇺🇸',
    name: 'Spocket',
    tagline: 'Suppliers US/EU livraison 3-5 jours',
    desc: 'Fournisseurs premium US/EU. Branded invoicing. API REST sur ta clé partenaire.',
    secretKeys: ['SPOCKET_KEY'],
    color: '#06b6d4',
    docs: 'https://docs.spocket.co/',
  },
  {
    key: 'printful',
    emoji: '👕',
    name: 'Printful',
    tagline: 'Print-on-demand monde entier',
    desc: 'T-shirts, mugs, posters, hoodies. Entrepôts EU à Riga & Madrid. Aucun stock à gérer.',
    secretKeys: ['PRINTFUL_KEY', 'PRINTFUL_STORE_ID'],
    color: '#10b981',
    docs: 'https://www.printful.com/docs',
  },
];

export function DropshippingClient({ orgSlug }: { orgSlug: string }) {
  const [testing, setTesting] = useState<ProviderKey | null>(null);
  const [results, setResults] = useState<Record<ProviderKey, { ok: boolean; message: string } | null>>({
    aliexpress: null, spocket: null, printful: null,
  });

  async function testProvider(p: ProviderKey) {
    setTesting(p);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/dropshipping/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: p }),
      });
      const j = await r.json();
      setResults((cur) => ({ ...cur, [p]: { ok: !!j.ok, message: j.message || (j.ok ? 'OK' : 'Erreur') } }));
    } catch (e: any) {
      setResults((cur) => ({ ...cur, [p]: { ok: false, message: e?.message || 'Erreur réseau' } }));
    } finally {
      setTesting(null);
    }
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="📥"
      title="Dropshipping"
      desc="Connecte tes fournisseurs : commande → fournisseur imprime/expédie → tu touches la marge."
      actions={<Link href={`/dashboard/orgs/${orgSlug}/keys`} style={btnSecondary as any}>🔑 Clés API</Link>}
    >
      {/* Comparatif */}
      <section style={{ ...card, marginBottom: 16, padding: 14 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7 }}>Comment choisir ?</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: 12 }}>
          <div style={{ padding: 10, background: '#f9731611', border: '1px solid #f9731633', borderRadius: 8 }}>
            <strong style={{ color: '#f97316' }}>🛍️ ALIEXPRESS</strong><br />
            <span style={{ opacity: 0.8 }}>Catalogue gigantesque, prix bas, mais shipping 15-30j depuis la Chine. Idéal pour tester un produit.</span>
          </div>
          <div style={{ padding: 10, background: '#06b6d411', border: '1px solid #06b6d433', borderRadius: 8 }}>
            <strong style={{ color: '#06b6d4' }}>🇺🇸 SPOCKET</strong><br />
            <span style={{ opacity: 0.8 }}>Suppliers premium US/EU, shipping 3-5j, branded invoicing. Marges plus fines mais meilleure UX client.</span>
          </div>
          <div style={{ padding: 10, background: '#10b98111', border: '1px solid #10b98133', borderRadius: 8 }}>
            <strong style={{ color: '#10b981' }}>👕 PRINTFUL</strong><br />
            <span style={{ opacity: 0.8 }}>POD : tes designs sur t-shirts/mugs/posters. Aucun stock. Idéal pour merch de marque.</span>
          </div>
        </div>
      </section>

      {/* Cartes providers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 16 }}>
        {PROVIDERS.map((p) => {
          const result = results[p.key];
          return (
            <article key={p.key} style={{ ...card, padding: 0, overflow: 'hidden', borderTop: `3px solid ${p.color}` }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {p.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{p.name}</h3>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>{p.tagline}</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, opacity: 0.75, margin: '0 0 12px', lineHeight: 1.5 }}>{p.desc}</p>

                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>Clés requises</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                  {p.secretKeys.map((k) => <li key={k} style={{ fontFamily: 'monospace' }}>· {k}</li>)}
                </ul>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    style={{ ...btnPrimary, background: p.color, boxShadow: `0 4px 12px ${p.color}55` }}
                    disabled={testing === p.key}
                    onClick={() => testProvider(p.key)}
                  >
                    {testing === p.key ? 'Test…' : 'Tester'}
                  </button>
                  <Link href={`/dashboard/orgs/${orgSlug}/keys`} style={btnSecondary as any}>Configurer</Link>
                  <a href={p.docs} target="_blank" rel="noopener" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>↗ Docs</a>
                </div>

                {result && (
                  <div style={{
                    marginTop: 12, padding: 10, borderRadius: 8, fontSize: 12,
                    background: result.ok ? '#10b98111' : '#ef444411',
                    border: `1px solid ${result.ok ? '#10b98144' : '#ef444444'}`,
                    color: result.ok ? colors.success : colors.danger,
                  }}>
                    {result.ok ? '✓' : '✗'} {result.message}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Workflow */}
      <section style={{ ...card, padding: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Comment ça marche</h3>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, opacity: 0.85 }}>
          <li>Tu configures ta clé API du fournisseur (page Clés API ci-dessus).</li>
          <li>Tu crées tes produits dans la <Link href={`/dashboard/orgs/${orgSlug}/shop`}>Boutique</Link> et tu renseignes l'ID variant du fournisseur dans le produit.</li>
          <li>Quand un client paie (webhook Stripe), la commande est créée automatiquement.</li>
          <li>Depuis la page <Link href={`/dashboard/orgs/${orgSlug}/orders`}>Commandes</Link>, tu cliques « → Provider » et la commande part chez lui.</li>
          <li>Le fournisseur imprime, emballe, expédie ; tu reçois un tracking number et tu touches la marge.</li>
        </ol>
      </section>
    </SimpleOrgPage>
  );
}
