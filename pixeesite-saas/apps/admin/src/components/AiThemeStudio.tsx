'use client';
import { useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

const EXAMPLES = [
  'Photographe de mariage chic-bohème en Île-de-France',
  'Restaurant gastronomique vegan à Bordeaux',
  'SaaS B2B pour automation marketing',
  'Coach business pour entrepreneurs solo',
  'Studio yoga / méditation Paris 11',
  'Boutique en ligne bijoux artisanaux',
  'Cabinet conseil stratégie B2B',
  'Agence créative branding Paris',
];

export function AiThemeStudio({ orgSlug }: { orgSlug: string }) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(apply = false) {
    if (!brief.trim()) { setError('Décris ton business'); return; }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai/theme`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, apply }),
      });
      const j = await r.json();
      if (r.ok) setResult(j);
      else setError(j.error || 'Erreur IA');
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  async function createSiteFromTheme() {
    if (!result) return;
    const r = await fetch(`/api/orgs/${orgSlug}/sites`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: result.theme.name,
        slug: result.theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        blocksSeed: result.blocksSeed,
        theme: result.theme,
      }),
    });
    if (r.ok) {
      const j = await r.json();
      window.location.href = `/dashboard/orgs/${orgSlug}/sites/${j.slug || j.site?.slug}`;
    } else {
      const j = await r.json();
      alert('Erreur création site : ' + (j.error || 'inconnu'));
    }
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🪄" title="Studio IA — génère ton thème"
      desc="Décris ton business en une phrase. L'IA génère couleurs, typo, hero, services, pages."
    >
      <div style={{ ...card, padding: 20, marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Description du business</div>
          <textarea style={{ ...input, minHeight: 80, fontSize: 15 }}
            placeholder="Ex: Photographe de mariage chic-bohème en Île-de-France"
            value={brief} onChange={(e) => setBrief(e.target.value)} />
        </label>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>Inspirations :</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setBrief(ex)}
                style={{ background: '#27272a', border: '1px solid #3f3f46', color: 'inherit', padding: '4px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer' }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => generate(false)} disabled={loading} style={btnPrimary}>
            {loading ? '⏳ Génération…' : '✨ Générer le thème'}
          </button>
          {result && (
            <button onClick={createSiteFromTheme} style={{ ...btnPrimary, background: '#10b981' }}>
              🚀 Créer le site
            </button>
          )}
        </div>
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>❌ {error}</div>}
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Theme card */}
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>🎨 Identité</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>Couleur principale</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ width: 32, height: 32, background: result.theme.primaryColor, borderRadius: 8, border: '1px solid #3f3f46' }} />
                  <code style={{ fontSize: 11 }}>{result.theme.primaryColor}</code>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>Couleur accent</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ width: 32, height: 32, background: result.theme.secondaryColor, borderRadius: 8, border: '1px solid #3f3f46' }} />
                  <code style={{ fontSize: 11 }}>{result.theme.secondaryColor}</code>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Police</div>
              <div style={{ fontSize: 18, fontFamily: result.theme.font, marginTop: 4 }}>{result.theme.font}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Ton</div>
              <span style={{ display: 'inline-block', background: result.theme.primaryColor + '33', color: result.theme.primaryColor, padding: '4px 10px', borderRadius: 999, fontSize: 12, marginTop: 4 }}>
                {result.theme.tone}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Tagline</div>
              <div style={{ fontStyle: 'italic', marginTop: 4 }}>« {result.theme.tagline} »</div>
            </div>
          </div>

          {/* Hero preview */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <h3 style={{ margin: 0, padding: '12px 16px', borderBottom: '1px solid #27272a' }}>👁️ Hero preview</h3>
            <div style={{
              padding: 32, minHeight: 280,
              background: `linear-gradient(180deg, ${result.theme.primaryColor}33 0%, ${result.theme.secondaryColor || result.theme.primaryColor}88 100%), url(https://source.unsplash.com/600x400/?${encodeURIComponent(result.theme.heroBgKeyword || 'business')}) center/cover`,
              fontFamily: result.theme.font,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {result.theme.heroTitle}
              </div>
              <div style={{ fontSize: 14, color: 'white', opacity: 0.9, marginTop: 8, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {result.theme.heroSubtitle}
              </div>
              <button style={{
                marginTop: 16, alignSelf: 'flex-start',
                background: result.theme.primaryColor, color: 'white', border: 0,
                padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
              }}>{result.theme.heroCtaLabel}</button>
            </div>
          </div>

          {/* Services */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0 }}>💼 Services proposés</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {(result.theme.services || []).map((s: any, i: number) => (
                <div key={i} style={{ background: '#0a0a0f', padding: 14, borderRadius: 10 }}>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>{s.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{s.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* About preview */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0 }}>📝 À propos (généré)</h3>
            <div style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.85 }}
              dangerouslySetInnerHTML={{ __html: result.theme.aboutHtml || '' }} />
          </div>

          {/* Pages structure */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0 }}>🗺️ Structure du site</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(result.blocksSeed?.pages || []).map((p: any) => (
                <div key={p.slug} style={{ background: '#0a0a0f', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}>
                  <code style={{ color: result.theme.primaryColor }}>{p.slug}</code>
                  <span style={{ marginLeft: 6, opacity: 0.6 }}>{p.title}</span>
                  <span style={{ marginLeft: 8, opacity: 0.4, fontSize: 10 }}>· {p.blocks.length} blocs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
