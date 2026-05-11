'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Theme = {
  id: string;
  slug: string;
  name: string;
  season?: string | null;
  palette: any;
  fonts?: any;
  blocks?: any;
  active: boolean;
  scheduledFrom?: string | null;
  scheduledUntil?: string | null;
  previewImage?: string | null;
  createdAt?: string;
};

const DECORATIONS_LIST = ['snow', 'hearts', 'confetti', 'petals', 'fireworks', 'bubbles', 'leaves', 'stars', 'pumpkins', 'eggs', 'lanterns', 'diamonds', 'rainbow'];
const SEASONS = [
  { v: '', l: '—' },
  { v: 'spring', l: '🌸 Printemps' },
  { v: 'summer', l: '☀️ Été' },
  { v: 'autumn', l: '🍂 Automne' },
  { v: 'winter', l: '❄️ Hiver' },
];

const PRESETS = [
  'Aurore boréale glacée, ambiance mystique, particules d\'étoiles',
  'Tropical néon synthwave avec coucher de soleil sur palmiers',
  'Cathédrale gothique vitraux multicolores, sombre et solennel',
  'Plage tropicale rose et turquoise, fête joyeuse, bulles',
  'Cyberpunk dystopique néons jaunes et magenta sur noir',
  'Jardin japonais cerisiers en fleurs, calme zen, pétales',
  'Galaxie cosmique violette avec étoiles scintillantes',
  'Forêt enchantée brume verte mystique avec feuilles',
  'Disco 70s funk pailleté multicolore avec confettis',
  'Hiver scandinave bleu glace et blanc, flocons de neige',
];

export function ThemesClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [editing, setEditing] = useState<Theme | null>(null);
  const [tab, setTab] = useState<'gallery' | 'generate'>('gallery');

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/themes`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function seedDefaults(wipe: boolean) {
    if (wipe && !confirm('Effacer TOUS les thèmes et réinitialiser ?')) return;
    setBusy('seed');
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/themes/seed`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipe }),
      });
      const j = await r.json();
      if (r.ok) {
        alert(`✓ ${j.stats.created} créés · ${j.stats.kept} conservés${wipe ? ` · ${j.stats.deleted} effacés` : ''}`);
        load();
      } else alert(`Erreur : ${j.error}`);
    } finally { setBusy(null); }
  }

  async function activate(t: Theme) {
    setBusy(t.id);
    try {
      await fetch(`/api/orgs/${orgSlug}/themes/${t.id}/activate`, { method: 'POST' });
      await load();
    } finally { setBusy(null); }
  }

  async function deactivate(t: Theme) {
    setBusy(t.id);
    try {
      await fetch(`/api/orgs/${orgSlug}/themes/${t.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      await load();
    } finally { setBusy(null); }
  }

  async function remove(t: Theme) {
    if (!confirm(`Supprimer le thème "${t.name}" ?`)) return;
    setBusy(t.id);
    try {
      await fetch(`/api/orgs/${orgSlug}/themes/${t.id}`, { method: 'DELETE' });
      await load();
    } finally { setBusy(null); }
  }

  async function saveEdit(data: any) {
    if (!editing) return;
    setBusy(editing.id);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/themes/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (r.ok) { setEditing(null); await load(); }
    } finally { setBusy(null); }
  }

  const filtered = useMemo(() => filter ? items.filter((t) => t.season === filter) : items, [items, filter]);
  const activeTheme = items.find((t) => t.active);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🎨" title="Thèmes saisonniers"
      desc="Change l'ambiance de ton site selon la saison/fête. Génération IA + palette manuelle."
      actions={
        items.length === 0 ? (
          <button style={btnPrimary} onClick={() => seedDefaults(false)} disabled={busy === 'seed'}>
            {busy === 'seed' ? '…' : '✨'} Seed thèmes par défaut
          </button>
        ) : (
          <>
            <button style={btnSecondary} onClick={() => seedDefaults(false)} disabled={busy === 'seed'}>+ Manquants</button>
            <button style={btnSecondary} onClick={() => seedDefaults(true)} disabled={busy === 'seed'}>↻ Reset</button>
          </>
        )
      }
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 999, padding: 4, width: 'fit-content' }}>
        <button onClick={() => setTab('gallery')} style={{ padding: '6px 14px', borderRadius: 999, border: 0, background: tab === 'gallery' ? colors.primary : 'transparent', color: tab === 'gallery' ? '#fff' : 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          🎨 Galerie ({items.length})
        </button>
        <button onClick={() => setTab('generate')} style={{ padding: '6px 14px', borderRadius: 999, border: 0, background: tab === 'generate' ? colors.primary : 'transparent', color: tab === 'generate' ? '#fff' : 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          ✨ Générer IA
        </button>
      </div>

      {tab === 'generate' && <ThemeAIGenerator orgSlug={orgSlug} onCreated={() => { load(); setTab('gallery'); }} />}

      {tab === 'gallery' && (
        <>
          {/* Thème actif */}
          {activeTheme && (
            <section style={{ ...card, marginBottom: 16, background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(139,92,246,0.1))', borderColor: 'rgba(236,72,153,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${activeTheme.palette?.primary}, ${activeTheme.palette?.secondary})`, border: '2px solid rgba(255,255,255,0.2)' }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#f472b6', textTransform: 'uppercase' }}>Thème actif maintenant</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{activeTheme.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{activeTheme.slug}</div>
                </div>
              </div>
              <button style={btnSecondary} onClick={() => deactivate(activeTheme)} disabled={busy === activeTheme.id}>✗ Désactiver</button>
            </section>
          )}

          {/* Filtres saison */}
          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SEASONS.map((s) => (
              <button key={s.v} onClick={() => setFilter(filter === s.v ? '' : s.v)} style={{ ...btnSecondary, padding: '4px 12px', fontSize: 11, background: filter === s.v ? colors.primary : colors.bgCard, color: filter === s.v ? '#fff' : 'inherit' }}>
                {s.l}
              </button>
            ))}
          </div>

          {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : filtered.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48 }}>🎨</div>
              <p style={{ opacity: 0.6 }}>Aucun thème. Clique « Seed thèmes par défaut » ou génère avec l'IA.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {filtered.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  busy={busy === t.id}
                  onActivate={() => activate(t)}
                  onDeactivate={() => deactivate(t)}
                  onRemove={() => remove(t)}
                  onEdit={() => setEditing(t)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editing && <EditModal theme={editing} onSave={saveEdit} onClose={() => setEditing(null)} busy={busy === editing.id} />}
    </SimpleOrgPage>
  );
}

function ThemeCard({ theme, busy, onActivate, onDeactivate, onRemove, onEdit }: any) {
  const c = theme.palette || {};
  const blocks = theme.blocks || {};
  const decoCount = Object.values(blocks).filter(Boolean).length;
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden', border: theme.active ? `2px solid ${colors.success}` : `1px solid ${colors.border}` }}>
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, ${c.primary || '#d61b80'} 0%, ${c.secondary || '#7c3aed'} 50%, ${c.accent || '#06b6d4'} 100%)`,
          position: 'relative',
        }}
      >
        {theme.active && (
          <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: colors.success, color: '#fff' }}>✓ ACTIF</span>
        )}
        {decoCount > 0 && (
          <span style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', color: '#fff' }}>
            ✨ {decoCount} effets
          </span>
        )}
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{theme.name}</div>
        {theme.season && <div style={{ fontSize: 10, opacity: 0.6 }}>{theme.season}</div>}
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {[c.primary, c.secondary, c.accent, c.bg, c.fg].filter(Boolean).map((color: string, i: number) => (
            <span key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: color, border: '1px solid rgba(255,255,255,0.1)' }} title={color} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {theme.active ? (
            <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 10, flex: 1 }} onClick={onDeactivate} disabled={busy}>
              {busy ? '…' : '✗'} Désactiver
            </button>
          ) : (
            <button style={{ ...btnPrimary, padding: '5px 8px', fontSize: 10, flex: 1, background: colors.success, boxShadow: 'none' }} onClick={onActivate} disabled={busy}>
              {busy ? '…' : '✓'} Activer
            </button>
          )}
          <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 10 }} onClick={onEdit} title="Modifier">✎</button>
          <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 10, color: '#fca5a5' }} onClick={onRemove} disabled={busy} title="Supprimer">🗑</button>
        </div>
      </div>
    </div>
  );
}

function ThemeAIGenerator({ orgSlug, onCreated }: { orgSlug: string; onCreated: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [saved, setSaved] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;
    setBusy(true); setPreview(null); setSaved(false);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/themes/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const j = await r.json();
      if (j.ok && j.theme) setPreview(j.theme);
      else alert(`Erreur : ${j.error || 'IA n\'a pas pu générer'}`);
    } finally { setBusy(false); }
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/themes/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, save: true }),
      });
      const j = await r.json();
      if (j.ok && j.theme) { setSaved(true); onCreated(); }
      else alert(`Erreur sauvegarde : ${j.error}`);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, marginTop: 8 }}>
      <div>
        <div style={{ ...card, background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(139,92,246,0.1))', borderColor: 'rgba(236,72,153,0.3)' }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>✨ Décris l'ambiance souhaitée</h3>
          <p style={{ fontSize: 11, opacity: 0.6, marginTop: -4 }}>L'IA génère palette + animations + fonts.</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Ex : Cyberpunk néon rose et cyan, club futuriste avec étoiles…"
            style={{ ...input, fontFamily: 'inherit' }}
          />
          <button onClick={generate} disabled={busy || !prompt.trim()} style={{ ...btnPrimary, width: '100%', marginTop: 8 }}>
            {busy ? '… Gemini conçoit ton thème' : '✨ Générer le thème'}
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 6 }}>Suggestions rapides</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setPrompt(p)} style={{ ...card, padding: 8, textAlign: 'left', cursor: 'pointer', fontSize: 11 }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        {!preview && !busy && (
          <div style={{ ...card, padding: 48, textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: 48 }}>🪄</div>
            <p style={{ fontSize: 12 }}>Décris une ambiance et clique « Générer le thème ».</p>
          </div>
        )}
        {busy && !preview && (
          <div style={{ ...card, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>L'IA imagine ton thème…</div>
          </div>
        )}
        {preview && (
          <div>
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{
                height: 120,
                background: `linear-gradient(135deg, ${preview.palette?.primary} 0%, ${preview.palette?.secondary} 50%, ${preview.palette?.accent} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: preview.palette?.fg || '#fff',
              }}>
                {preview.name}
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>{preview.description}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, opacity: 0.6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {preview.season && <span>🍃 {preview.season}</span>}
                  {preview.mood && <span>💫 {preview.mood}</span>}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 }}>Palette</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
                  {(['primary', 'secondary', 'accent', 'bg', 'fg'] as const).map((k) => (
                    <div key={k} style={{ textAlign: 'center' }}>
                      <div style={{ height: 32, borderRadius: 6, background: preview.palette?.[k], marginBottom: 2, border: '1px solid rgba(255,255,255,0.1)' }} />
                      <div style={{ fontSize: 9, opacity: 0.5 }}>{k}</div>
                      <div style={{ fontSize: 9, fontFamily: 'monospace', opacity: 0.4 }}>{preview.palette?.[k]}</div>
                    </div>
                  ))}
                </div>
                {preview.blocks && Object.values(preview.blocks).some(Boolean) && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 }}>Animations actives</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                      {Object.entries(preview.blocks).filter(([_, v]) => v).map(([k]) => (
                        <span key={k} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(236,72,153,0.2)', color: '#f472b6' }}>✨ {k}</span>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                  <button onClick={save} disabled={busy || saved} style={{ ...btnPrimary, background: colors.success, boxShadow: 'none' }}>
                    {busy ? '…' : saved ? '✓ Enregistré' : '💾 Sauvegarder'}
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(preview, null, 2))} style={btnSecondary}>
                    📋 Copier JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditModal({ theme, onSave, onClose, busy }: { theme: Theme; onSave: (d: any) => void; onClose: () => void; busy: boolean }) {
  const [data, setData] = useState({
    name: theme.name,
    season: theme.season || '',
    primary: theme.palette?.primary || '#d61b80',
    secondary: theme.palette?.secondary || '#7c3aed',
    accent: theme.palette?.accent || '#06b6d4',
    bg: theme.palette?.bg || '#0a0a14',
    fg: theme.palette?.fg || '#ffffff',
    heading: theme.fonts?.heading || 'Inter',
    body: theme.fonts?.body || 'Inter',
    blocks: theme.blocks || {},
    scheduledFrom: theme.scheduledFrom ? theme.scheduledFrom.slice(0, 10) : '',
    scheduledUntil: theme.scheduledUntil ? theme.scheduledUntil.slice(0, 10) : '',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }} onClick={onClose}>
      <div style={{ ...card, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>✎ Personnaliser : {theme.name}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'inherit', fontSize: 18, cursor: 'pointer', opacity: 0.5 }}>✗</button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Nom</span>
              <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} style={input} />
            </label>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Saison</span>
              <select value={data.season} onChange={(e) => setData({ ...data, season: e.target.value })} style={input}>
                {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </label>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>Palette</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {(['primary', 'secondary', 'accent', 'bg', 'fg'] as const).map((k) => (
                <label key={k} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{k}</span>
                  <input type="color" value={(data as any)[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} style={{ width: '100%', height: 40, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                  <span style={{ fontSize: 9, fontFamily: 'monospace', opacity: 0.5 }}>{(data as any)[k]}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Police titre (Google Font)</span>
              <input value={data.heading} onChange={(e) => setData({ ...data, heading: e.target.value })} placeholder="Inter, Playfair Display…" style={input} />
            </label>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Police corps</span>
              <input value={data.body} onChange={(e) => setData({ ...data, body: e.target.value })} style={input} />
            </label>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>Effets / décorations</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {DECORATIONS_LIST.map((d) => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4, fontSize: 11, cursor: 'pointer', background: (data.blocks as any)[d] ? 'rgba(236,72,153,0.15)' : 'transparent', borderRadius: 6 }}>
                  <input type="checkbox" checked={!!(data.blocks as any)[d]} onChange={(e) => setData({ ...data, blocks: { ...data.blocks, [d]: e.target.checked } })} />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Planifier de</span>
              <input type="date" value={data.scheduledFrom} onChange={(e) => setData({ ...data, scheduledFrom: e.target.value })} style={input} />
            </label>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Planifier jusqu'à</span>
              <input type="date" value={data.scheduledUntil} onChange={(e) => setData({ ...data, scheduledUntil: e.target.value })} style={input} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={btnSecondary} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} disabled={busy} onClick={() => onSave({
            name: data.name,
            season: data.season || null,
            palette: { primary: data.primary, secondary: data.secondary, accent: data.accent, bg: data.bg, fg: data.fg },
            fonts: { heading: data.heading, body: data.body },
            blocks: data.blocks,
            scheduledFrom: data.scheduledFrom || null,
            scheduledUntil: data.scheduledUntil || null,
          })}>
            {busy ? '…' : '💾 Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
