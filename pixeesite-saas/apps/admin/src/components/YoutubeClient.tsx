'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Video = {
  id: string; videoId: string; title: string; description?: string | null;
  thumbnail?: string | null; channel?: string | null; category?: string | null;
  featured: boolean; position: number; publishedAt?: string | null;
};

export function YoutubeClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/youtube`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!url) return;
    setBusy(true);
    const r = await fetch(`/api/orgs/${orgSlug}/youtube`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { alert('Erreur: ' + (j.error || r.status)); return; }
    if (!j.hadApiKey) console.warn('Pas de YOUTUBE_API_KEY — métadonnées limitées');
    setUrl(''); load();
  }

  async function toggleFeatured(v: Video) {
    await fetch(`/api/orgs/${orgSlug}/youtube/${v.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !v.featured }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette vidéo ?')) return;
    await fetch(`/api/orgs/${orgSlug}/youtube/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="📺" title="Vidéos YouTube"
      desc="Colle l'URL d'une vidéo — l'ID est extrait et les métadonnées récupérées via la YouTube Data API (clé org YOUTUBE_API_KEY)."
    >
      <section style={{ ...card, marginBottom: 16 }}>
        <label style={lbl}>Ajouter une vidéo (URL YouTube ou ID)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...input, flex: 1 }} value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button style={btnPrimary} onClick={add} disabled={busy}>{busy ? '…' : 'Ajouter'}</button>
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
          Astuce: pour récupérer titre, description et thumbnail HQ, configure <code>YOUTUBE_API_KEY</code> dans Réglages → Secrets.
        </div>
      </section>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
      : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📺</div>
          <p style={{ opacity: 0.6 }}>Aucune vidéo. Ajoute une URL ci-dessus.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {items.map((v) => (
            <div key={v.id} style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`https://youtu.be/${v.videoId}`} target="_blank" rel="noopener" style={{ position: 'relative', display: 'block' }}>
                <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`} alt={v.title}
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} />
                <span style={{ position: 'absolute', top: 8, right: 8, ...pill, background: '#0008', color: 'white' }}>▶</span>
              </a>
              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{v.title}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                {v.channel && <>{v.channel}</>}
                {v.publishedAt && <> · {new Date(v.publishedAt).toLocaleDateString('fr-FR')}</>}
              </div>
              {v.featured && <span style={{ ...pill, background: colors.primary + '22', color: colors.primary, alignSelf: 'flex-start' }}>★ mis en avant</span>}
              <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 11 }} onClick={() => toggleFeatured(v)}>
                  {v.featured ? '☆ Retirer' : '★ Promouvoir'}
                </button>
                <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 11, color: '#ef4444' }} onClick={() => remove(v.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SimpleOrgPage>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
const pill: React.CSSProperties = { background: '#27272a', color: '#a1a1aa', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
