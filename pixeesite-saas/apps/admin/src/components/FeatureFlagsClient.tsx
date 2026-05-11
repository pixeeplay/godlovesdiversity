'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type FeatureFlag = {
  id: string;
  key: string;
  displayName?: string | null;
  description?: string | null;
  value: boolean;
  rollout: number;
  conditions?: any;
  audience?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const AUDIENCE_PRESETS = [
  { v: '', l: 'Tous' },
  { v: 'premium', l: '💎 Premium' },
  { v: 'beta', l: '🧪 Beta' },
  { v: 'internal', l: '👨‍💻 Internal' },
  { v: 'free', l: '🆓 Free' },
];

export function FeatureFlagsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/feature-flags`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(f: FeatureFlag) {
    setBusy(f.id);
    try {
      await fetch(`/api/orgs/${orgSlug}/feature-flags/${f.id}/toggle`, { method: 'POST' });
      await load();
    } finally { setBusy(null); }
  }

  async function patch(f: FeatureFlag, data: any) {
    setBusy(f.id);
    try {
      await fetch(`/api/orgs/${orgSlug}/feature-flags/${f.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await load();
    } finally { setBusy(null); }
  }

  async function remove(f: FeatureFlag) {
    if (!confirm(`Supprimer le flag "${f.key}" ?`)) return;
    setBusy(f.id);
    try {
      await fetch(`/api/orgs/${orgSlug}/feature-flags/${f.id}`, { method: 'DELETE' });
      await load();
    } finally { setBusy(null); }
  }

  async function save(draft: any) {
    setBusy('new');
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/feature-flags`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (r.ok) { setShowNew(false); setEditing(null); await load(); }
      else alert(`Erreur : ${j.error}`);
    } finally { setBusy(null); }
  }

  const onCount = useMemo(() => items.filter((f) => f.value).length, [items]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🚦" title="Feature flags"
      desc={`Active/désactive des features sans redéployer. ${onCount}/${items.length} actives.`}
      actions={<button style={btnPrimary} onClick={() => { setEditing(null); setShowNew(true); }}>+ Nouveau flag</button>}
    >
      <div style={{ marginBottom: 12, padding: 12, ...card, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)', fontSize: 12 }}>
        💡 Utilise <code>isFeatureEnabled('key', orgSlug)</code> côté serveur. Le <strong>rollout %</strong> permet de déployer progressivement (bucket sticky par userId). <strong>Conditions</strong> = JSON avec règles d'audience (plan, pays, etc.).
      </div>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>🚦</div>
          <p style={{ opacity: 0.6 }}>Aucun feature flag. Crées-en pour gérer le déploiement progressif.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((f) => (
            <article key={f.id} style={{ ...card, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{f.displayName || f.key}</strong>
                    <code style={{ fontSize: 10, opacity: 0.6, background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>{f.key}</code>
                    {f.audience && <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 8, background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>{f.audience}</span>}
                  </div>
                  {f.description && <div style={{ fontSize: 12, opacity: 0.7 }}>{f.description}</div>}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>Rollout</span>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={f.rollout}
                      onChange={(e) => patch(f, { rollout: parseInt(e.target.value, 10) })}
                      style={{ flex: 1, maxWidth: 200 }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, width: 40 }}>{f.rollout}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <button
                    onClick={() => toggle(f)}
                    disabled={busy === f.id}
                    style={{
                      ...btnSecondary, padding: '8px 12px',
                      background: f.value ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.15)',
                      color: f.value ? colors.success : '#9ca3af',
                      fontWeight: 700, fontSize: 12, minWidth: 70,
                    }}
                  >
                    {f.value ? '● ON' : '○ OFF'}
                  </button>
                  <button style={{ ...btnSecondary, padding: '8px 10px', fontSize: 12 }} onClick={() => setEditing(f)}>✎</button>
                  <button style={{ ...btnSecondary, padding: '8px 10px', fontSize: 12, color: '#fca5a5' }} onClick={() => remove(f)} disabled={busy === f.id}>🗑</button>
                </div>
              </div>
              {f.conditions && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 11, opacity: 0.6 }}>▸ Conditions JSON</summary>
                  <pre style={{ background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6, marginTop: 4, fontSize: 10, overflowX: 'auto' }}>
                    {JSON.stringify(f.conditions, null, 2)}
                  </pre>
                </details>
              )}
            </article>
          ))}
        </div>
      )}

      {(showNew || editing) && (
        <EditFlagModal
          flag={editing}
          onSave={(d) => editing ? patch(editing, d).then(() => setEditing(null)) : save(d)}
          onClose={() => { setShowNew(false); setEditing(null); }}
          busy={busy === 'new' || (editing ? busy === editing.id : false)}
        />
      )}
    </SimpleOrgPage>
  );
}

function EditFlagModal({ flag, onSave, onClose, busy }: { flag: FeatureFlag | null; onSave: (d: any) => void; onClose: () => void; busy: boolean }) {
  const [data, setData] = useState({
    key: flag?.key || '',
    displayName: flag?.displayName || '',
    description: flag?.description || '',
    value: flag?.value ?? false,
    rollout: flag?.rollout ?? 100,
    audience: flag?.audience || '',
    conditions: flag?.conditions ? JSON.stringify(flag.conditions, null, 2) : '',
  });
  const [jsonErr, setJsonErr] = useState('');

  function submit() {
    let conditions: any = null;
    if (data.conditions.trim()) {
      try { conditions = JSON.parse(data.conditions); }
      catch (e: any) { setJsonErr(e?.message || 'JSON invalide'); return; }
    }
    setJsonErr('');
    const payload: any = {
      displayName: data.displayName,
      description: data.description,
      value: data.value,
      rollout: data.rollout,
      audience: data.audience || null,
      conditions,
    };
    if (!flag) payload.key = data.key;
    onSave(payload);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }} onClick={onClose}>
      <div style={{ ...card, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{flag ? `✎ ${flag.key}` : 'Nouveau feature flag'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'inherit', fontSize: 18, cursor: 'pointer', opacity: 0.5 }}>✗</button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {!flag && (
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Key (slug)</span>
              <input value={data.key} onChange={(e) => setData({ ...data, key: e.target.value })} placeholder="new_dashboard_v2" style={{ ...input, fontFamily: 'monospace' }} />
            </label>
          )}
          <label>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Nom d'affichage</span>
            <input value={data.displayName} onChange={(e) => setData({ ...data, displayName: e.target.value })} placeholder="Nouveau dashboard V2" style={input} />
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Description</span>
            <textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={2} style={{ ...input, fontFamily: 'inherit' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>État</span>
              <select value={data.value ? 'on' : 'off'} onChange={(e) => setData({ ...data, value: e.target.value === 'on' })} style={input}>
                <option value="on">● ON</option>
                <option value="off">○ OFF</option>
              </select>
            </label>
            <label>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Audience preset</span>
              <select value={data.audience} onChange={(e) => setData({ ...data, audience: e.target.value })} style={input}>
                {AUDIENCE_PRESETS.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Rollout : <strong>{data.rollout}%</strong></span>
            <input type="range" min={0} max={100} step={5} value={data.rollout} onChange={(e) => setData({ ...data, rollout: parseInt(e.target.value, 10) })} style={{ width: '100%' }} />
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Conditions JSON (optionnel)</span>
            <textarea
              value={data.conditions}
              onChange={(e) => { setData({ ...data, conditions: e.target.value }); setJsonErr(''); }}
              rows={6}
              placeholder='{"plan": "premium", "country": ["FR", "BE"]}'
              style={{ ...input, fontFamily: 'monospace', fontSize: 11 }}
            />
            {jsonErr && <span style={{ fontSize: 10, color: colors.danger }}>{jsonErr}</span>}
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={btnSecondary} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} onClick={submit} disabled={busy || (!flag && !data.key.trim())}>
            {busy ? '…' : '💾 Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
