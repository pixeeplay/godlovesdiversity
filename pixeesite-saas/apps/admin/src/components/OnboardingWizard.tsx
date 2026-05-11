'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PALETTES = [
  { primary: '#d946ef', name: 'Magenta cyan' },
  { primary: '#06b6d4', name: 'Cyan' },
  { primary: '#10b981', name: 'Emerald' },
  { primary: '#f59e0b', name: 'Amber' },
  { primary: '#ef4444', name: 'Red' },
  { primary: '#8b5cf6', name: 'Violet' },
  { primary: '#0ea5e9', name: 'Sky' },
  { primary: '#ec4899', name: 'Pink' },
];

const FONTS = ['Inter', 'Poppins', 'DM Sans', 'Manrope', 'Playfair Display', 'Space Grotesk'];

const card = { background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: 24 };

export function OnboardingWizard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<any>({ primaryColor: '#d946ef', font: 'Inter' });
  const [creating, setCreating] = useState(false);

  async function finish() {
    setCreating(true);
    const r = await fetch('/api/orgs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name, slug: draft.slug,
        primaryColor: draft.primaryColor, font: draft.font,
        templateSlug: draft.templateSlug || null,
      }),
    });
    if (r.ok) {
      router.push(`/dashboard/orgs/${draft.slug}`);
    } else {
      alert('Erreur création org');
      setCreating(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fafafa', padding: 32 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? draft.primaryColor : '#27272a', transition: 'background .3s' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={card}>
            <h1 style={{ fontSize: 28, marginTop: 0 }}>👋 Bienvenue sur Pixeesite</h1>
            <p style={{ opacity: 0.7 }}>Créons ton espace de travail en 4 étapes. Comment s'appelle ton org ?</p>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Nom de l'organisation</div>
              <input style={{ width: '100%', padding: 12, background: '#0a0a0f', border: '1px solid #3f3f46', borderRadius: 8, color: 'inherit', fontSize: 15 }}
                value={draft.name || ''} onChange={(e) => {
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  setDraft({ ...draft, name: e.target.value, slug });
                }} placeholder="Studio Photo Lumière" />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>URL : <code style={{ color: draft.primaryColor }}>{draft.slug || 'mon-studio'}.pixeeplay.com</code></div>
              <input style={{ width: '100%', padding: 12, background: '#0a0a0f', border: '1px solid #3f3f46', borderRadius: 8, color: 'inherit', fontSize: 15, fontFamily: 'monospace' }}
                value={draft.slug || ''} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
            </label>
            <button disabled={!draft.name || !draft.slug} onClick={() => setStep(2)}
              style={{ background: draft.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Continuer →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={card}>
            <h1 style={{ fontSize: 24, marginTop: 0 }}>🎨 Identité visuelle</h1>
            <p style={{ opacity: 0.7 }}>Choisis ta couleur principale et ta police. Tu pourras changer plus tard.</p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>Couleur principale</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                {PALETTES.map((p) => (
                  <button key={p.primary} onClick={() => setDraft({ ...draft, primaryColor: p.primary })}
                    title={p.name}
                    style={{ aspectRatio: '1', background: p.primary, borderRadius: 8, border: draft.primaryColor === p.primary ? '3px solid white' : 'none', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>Police</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {FONTS.map((f) => (
                  <button key={f} onClick={() => setDraft({ ...draft, font: f })}
                    style={{
                      padding: 14, background: draft.font === f ? draft.primaryColor : '#0a0a0f',
                      border: '1px solid #3f3f46', borderRadius: 8,
                      color: draft.font === f ? 'white' : '#fafafa', cursor: 'pointer', fontFamily: f,
                    }}
                  >{f}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid #3f3f46', color: 'inherit', padding: '12px 20px', borderRadius: 10, cursor: 'pointer' }}>← Retour</button>
              <button onClick={() => setStep(3)} style={{ background: draft.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Continuer →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={card}>
            <h1 style={{ fontSize: 24, marginTop: 0 }}>✨ Premier site</h1>
            <p style={{ opacity: 0.7 }}>Pars d'un template ou commence de zéro.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { slug: '', label: '➕ Page blanche', desc: 'Je commence de zéro' },
                { slug: 'photo-portfolio', label: '📸 Portfolio photo', desc: 'Galerie + booking' },
                { slug: 'restaurant', label: '🍽️ Restaurant', desc: 'Menu + réservation' },
                { slug: 'saas-landing', label: '🚀 SaaS landing', desc: 'Hero + features + pricing' },
                { slug: 'ecommerce', label: '🛍️ E-commerce', desc: 'Catalogue + checkout' },
                { slug: 'link-in-bio', label: '🔗 Link in bio', desc: 'Tous tes liens' },
              ].map((t) => (
                <button key={t.slug} onClick={() => setDraft({ ...draft, templateSlug: t.slug })}
                  style={{
                    textAlign: 'left', padding: 14, borderRadius: 10,
                    background: draft.templateSlug === t.slug ? `${draft.primaryColor}22` : '#0a0a0f',
                    border: draft.templateSlug === t.slug ? `2px solid ${draft.primaryColor}` : '1px solid #3f3f46',
                    color: 'inherit', cursor: 'pointer',
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)} style={{ background: 'transparent', border: '1px solid #3f3f46', color: 'inherit', padding: '12px 20px', borderRadius: 10, cursor: 'pointer' }}>← Retour</button>
              <button onClick={() => setStep(4)} style={{ background: draft.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Continuer →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={card}>
            <h1 style={{ fontSize: 24, marginTop: 0 }}>🚀 Tout est prêt</h1>
            <div style={{ background: '#0a0a0f', borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 14, lineHeight: 1.7 }}>
              <div><strong>Org :</strong> {draft.name}</div>
              <div><strong>URL :</strong> <code style={{ color: draft.primaryColor }}>{draft.slug}.pixeeplay.com</code></div>
              <div><strong>Couleur :</strong> <span style={{ display: 'inline-block', width: 14, height: 14, background: draft.primaryColor, borderRadius: 4, verticalAlign: 'middle', marginRight: 6 }} />{draft.primaryColor}</div>
              <div><strong>Police :</strong> <span style={{ fontFamily: draft.font }}>{draft.font}</span></div>
              <div><strong>Template :</strong> {draft.templateSlug || 'Page blanche'}</div>
            </div>
            <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 16 }}>
              On crée ta DB tenant isolée + ton premier site. Ça prend ~5 secondes.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(3)} style={{ background: 'transparent', border: '1px solid #3f3f46', color: 'inherit', padding: '12px 20px', borderRadius: 10, cursor: 'pointer' }}>← Retour</button>
              <button disabled={creating} onClick={finish}
                style={{ background: draft.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                {creating ? 'Création…' : '🎉 Créer mon org'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
