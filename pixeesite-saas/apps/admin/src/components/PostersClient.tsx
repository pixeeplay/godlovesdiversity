'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Poster = {
  id: string; name: string; theme?: string | null;
  content?: any; imageUrl?: string | null; sizes: string[]; createdAt: string;
};

const SIZES = ['A4', 'A3', 'A2', 'square', 'story-9x16', 'landscape-16x9'];

export function PostersClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [gen, setGen] = useState<any>({ theme: '', name: '', sizes: ['A4'] });
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState<any>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/posters`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    if (!gen.theme) { alert('Thème requis'); return; }
    setBusy(true); setUsed(null);
    const r = await fetch(`/api/orgs/${orgSlug}/posters/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gen),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { alert('Erreur: ' + (j.error || r.status)); return; }
    setUsed(j.used);
    setShowGen(false); setGen({ theme: '', name: '', sizes: ['A4'] });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette affiche ?')) return;
    await fetch(`/api/orgs/${orgSlug}/posters?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🎨" title="Affiches"
      desc="Générateur d'affiches IA (Gemini pour le texte, FAL/FLUX pour l'image). Configure GEMINI_API_KEY et FAL_KEY dans Secrets."
      actions={<button style={btnPrimary} onClick={() => setShowGen(true)}>+ Générer une affiche</button>}
    >
      {used && (
        <div style={{ ...card, marginBottom: 12, background: '#10b98111', borderColor: '#10b98155', fontSize: 12 }}>
          ✓ Affiche générée — Gemini: {used.gemini ? '✓' : '✗ (clé manquante)'} · FAL: {used.fal ? '✓' : '✗ (clé manquante)'}
        </div>
      )}

      {showGen && (
        <div style={{ ...card, marginBottom: 16, background: '#0e0e14' }}>
          <h3 style={{ marginTop: 0 }}>Générer une affiche</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Thème *</label>
              <input style={input} value={gen.theme} onChange={(e) => setGen({ ...gen, theme: e.target.value })} placeholder="soirée jazz, vernissage expo photo, concert rock…" />
            </div>
            <div>
              <label style={lbl}>Nom (sinon auto)</label>
              <input style={input} value={gen.name} onChange={(e) => setGen({ ...gen, name: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Format</label>
              <select style={input} value={gen.sizes[0]} onChange={(e) => setGen({ ...gen, sizes: [e.target.value] })}>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Tagline (optionnel — sinon Gemini la génère)</label>
              <input style={input} value={gen.tagline || ''} onChange={(e) => setGen({ ...gen, tagline: e.target.value })} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Prompt image (optionnel — sinon thème = prompt)</label>
              <textarea style={{ ...input, minHeight: 60 }} value={gen.prompt || ''} onChange={(e) => setGen({ ...gen, prompt: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={generate} disabled={busy}>{busy ? 'Génération…' : '🎨 Générer'}</button>
            <button style={btnSecondary} onClick={() => setShowGen(false)}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
      : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
          <p style={{ opacity: 0.6 }}>Aucune affiche. Génère ta première !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {items.map((p) => (
            <div key={p.id} style={{ ...card, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: '100%', height: 200, background: '#0a0a0f', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎨</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
              {p.theme && <div style={{ fontSize: 11, opacity: 0.6 }}>{p.theme}</div>}
              {p.content?.tagline && <div style={{ fontSize: 11, fontStyle: 'italic', color: colors.primary }}>"{p.content.tagline}"</div>}
              <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                {p.imageUrl && <a href={p.imageUrl} target="_blank" rel="noopener" style={{ ...btnSecondary, padding: '4px 8px', fontSize: 11 }}>Ouvrir</a>}
                <button style={{ ...btnSecondary, padding: '4px 8px', fontSize: 11, color: '#ef4444', marginLeft: 'auto' }} onClick={() => remove(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SimpleOrgPage>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
