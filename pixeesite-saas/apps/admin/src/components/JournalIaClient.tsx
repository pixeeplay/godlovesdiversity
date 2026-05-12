'use client';
/**
 * JournalIaClient — Admin pour générer/éditer/approuver les entrées du SiteJournal.
 * Voix éditoriale quotidienne du site (multi-tenant).
 */
import { useEffect, useState, useMemo } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients } from '@/lib/design-tokens';

type Entry = {
  id: string;
  date: string;
  mood: string;
  moodScore: number;
  body: string;
  bodyShort?: string | null;
  approved: boolean;
  generatedBy: string;
  stats: any;
  createdAt: string;
};

const MOODS = ['joyful', 'reflective', 'energetic', 'calm', 'melancholic', 'curious'];

export function JournalIaClient({ orgSlug }: { orgSlug: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/journal-ia?limit=120`);
      const j = await r.json();
      setEntries(j.items || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [orgSlug]);

  async function regenerate(force = true) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/journal-ia/cron?force=${force ? 1 : 0}`);
      const j = await r.json();
      if (r.ok) { setMsg(j.skipped ? '✓ Déjà existant' : '✓ Entrée générée'); await load(); }
      else setMsg('Erreur: ' + (j.error || 'unknown'));
    } finally { setBusy(false); }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      await fetch(`/api/orgs/${orgSlug}/journal-ia/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: editing.body, bodyShort: editing.bodyShort, mood: editing.mood,
          moodScore: editing.moodScore, approved: editing.approved,
        }),
      });
      setEditing(null);
      await load();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    await fetch(`/api/orgs/${orgSlug}/journal-ia/${id}`, { method: 'DELETE' });
    await load();
  }

  const stats = useMemo(() => ({
    total: entries.length,
    approved: entries.filter((e) => e.approved).length,
    moods: new Set(entries.map((e) => e.mood)).size,
    avgMood: entries.length ? (entries.reduce((s, e) => s + e.moodScore, 0) / entries.length).toFixed(2) : '—',
  }), [entries]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="📖"
      title="Journal IA"
      desc="La voix éditoriale du site — entrées quotidiennes générées par IA (Gemini)."
      actions={<button onClick={() => regenerate(true)} disabled={busy} style={btnPrimary}>{busy ? '⏳' : '✨ Générer aujourd\'hui'}</button>}
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} grad={gradients.purple} />
        <Stat label="Approuvées" value={stats.approved} grad={gradients.green} />
        <Stat label="Moods distincts" value={stats.moods} grad={gradients.blue} />
        <Stat label="Mood moyen" value={stats.avgMood} grad={gradients.pink} />
      </section>

      {msg && <div style={{ ...card, padding: 10, marginBottom: 12 }}>{msg}</div>}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
        : entries.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48 }}>📔</div>
            <p style={{ opacity: 0.6 }}>Aucune entrée. Génère la première avec le bouton en haut.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {entries.map((e) => (
              <article key={e.id} style={{ ...card, padding: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                      <strong>{new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                      <span style={pill(colors.secondary)}>{e.mood}</span>
                      <span style={{ opacity: 0.6 }}>score {e.moodScore.toFixed(2)}</span>
                      {e.approved ? <span style={pill(colors.success)}>OK</span> : <span style={pill(colors.warning)}>EN ATTENTE</span>}
                      <span style={{ opacity: 0.5 }}>· {e.generatedBy}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
                      {e.bodyShort || e.body.slice(0, 240) + (e.body.length > 240 ? '…' : '')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => setEditing(e)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}>✏️ Éditer</button>
                    <button onClick={() => remove(e.id)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11, color: colors.danger }}>× Supprimer</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }} onClick={() => setEditing(null)}>
          <div style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>✏️ Éditer entrée {new Date(editing.date).toLocaleDateString('fr-FR')}</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Mood</div>
              <select value={editing.mood} onChange={(e) => setEditing({ ...editing, mood: e.target.value })} style={input}>
                {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Mood score (0-1)</div>
              <input type="number" min={0} max={1} step={0.05} value={editing.moodScore} onChange={(e) => setEditing({ ...editing, moodScore: Number(e.target.value) })} style={input} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Résumé court (teaser)</div>
              <input value={editing.bodyShort || ''} onChange={(e) => setEditing({ ...editing, bodyShort: e.target.value })} style={input} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Corps</div>
              <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} style={{ ...input, minHeight: 240, fontFamily: 'inherit' }} />
            </label>
            <label style={{ display: 'flex', gap: 6, fontSize: 13, marginBottom: 16 }}>
              <input type="checkbox" checked={editing.approved} onChange={(e) => setEditing({ ...editing, approved: e.target.checked })} />
              <span>Approuvée (visible publiquement)</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit} disabled={busy} style={btnPrimary}>{busy ? '⏳' : '✓ Enregistrer'}</button>
              <button onClick={() => setEditing(null)} style={btnSecondary}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}

function Stat({ label, value, grad }: { label: string; value: any; grad: string }) {
  return (
    <div style={{ ...card, padding: 14, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: grad, opacity: 0.07 }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}
function pill(c: string): React.CSSProperties {
  return { background: `${c}22`, color: c, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
}
