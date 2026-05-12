'use client';
/**
 * TranslationsClient — édition des traductions tenant + auto-translate batch.
 * Port faithful inspiré de GLD I18nAuditClient + AI-driven translation.
 */
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients } from '@/lib/design-tokens';

type Tr = {
  id: string;
  namespace: string;
  key: string;
  lang: string;
  value: string;
  context: string | null;
  approved: boolean;
  translatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

const COMMON_LANGS = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl', 'ar', 'he', 'tr', 'ru', 'zh', 'ja', 'ko', 'hi'];
const LANG_FLAG: Record<string, string> = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', pt: '🇵🇹', de: '🇩🇪', it: '🇮🇹', nl: '🇳🇱', ar: '🇸🇦', he: '🇮🇱', tr: '🇹🇷', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳' };

export function TranslationsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Tr[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNs, setFilterNs] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Tr> | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterNs) qs.set('namespace', filterNs);
      if (filterLang) qs.set('lang', filterLang);
      if (q) qs.set('q', q);
      const r = await fetch(`/api/orgs/${orgSlug}/translations?${qs}`);
      const j = await r.json();
      setItems(j.items || []);
      setNamespaces((j.namespaces || []).filter(Boolean));
      setLanguages((j.languages || []).filter(Boolean));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filterNs, filterLang, q, orgSlug]);

  // Group by (ns, key) → langs
  const grouped = useMemo(() => {
    const g = new Map<string, Map<string, Tr>>();
    for (const it of items) {
      const k = `${it.namespace}::${it.key}`;
      if (!g.has(k)) g.set(k, new Map());
      g.get(k)!.set(it.lang, it);
    }
    return Array.from(g.entries()).map(([k, m]) => ({
      ns: k.split('::')[0], key: k.split('::').slice(1).join('::'),
      langs: Array.from(m.entries()).reduce((acc, [l, t]) => { acc[l] = t; return acc; }, {} as Record<string, Tr>),
    }));
  }, [items]);

  async function save() {
    if (!editing || !editing.key || !editing.lang || typeof editing.value !== 'string') return;
    if (editing.id) {
      await fetch(`/api/orgs/${orgSlug}/translations/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editing.value, context: editing.context, approved: editing.approved }),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/translations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace: editing.namespace || 'default',
          key: editing.key, lang: editing.lang, value: editing.value,
          context: editing.context, approved: editing.approved,
        }),
      });
    }
    setEditing(null); load();
  }
  async function toggleApproved(t: Tr) {
    await fetch(`/api/orgs/${orgSlug}/translations/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: !t.approved }),
    });
    load();
  }
  async function remove(t: Tr) {
    if (!confirm(`Supprimer ${t.namespace}.${t.key} (${t.lang}) ?`)) return;
    await fetch(`/api/orgs/${orgSlug}/translations/${t.id}`, { method: 'DELETE' });
    load();
  }

  function exportJson() {
    const out: Record<string, Record<string, Record<string, string>>> = {};
    for (const it of items) {
      out[it.lang] = out[it.lang] || {};
      out[it.lang][it.namespace] = out[it.lang][it.namespace] || {};
      out[it.lang][it.namespace][it.key] = it.value;
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `translations-${orgSlug}.json`; a.click(); URL.revokeObjectURL(url);
  }

  async function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const t = await file.text();
    let obj: any; try { obj = JSON.parse(t); } catch { alert('JSON invalide'); return; }
    let count = 0;
    // Format: { lang: { namespace: { key: value } } } ou { lang: { key: value } }
    for (const lang of Object.keys(obj)) {
      const sub = obj[lang];
      if (typeof sub !== 'object') continue;
      for (const k1 of Object.keys(sub)) {
        if (typeof sub[k1] === 'string') {
          await fetch(`/api/orgs/${orgSlug}/translations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ namespace: 'default', key: k1, lang, value: sub[k1] }),
          });
          count++;
        } else if (typeof sub[k1] === 'object') {
          for (const k2 of Object.keys(sub[k1])) {
            if (typeof sub[k1][k2] === 'string') {
              await fetch(`/api/orgs/${orgSlug}/translations`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ namespace: k1, key: k2, lang, value: sub[k1][k2] }),
              });
              count++;
            }
          }
        }
      }
    }
    alert(`✓ ${count} traductions importées`);
    load();
  }

  const total = items.length;
  const approved = items.filter((t) => t.approved).length;
  const langCount = languages.length;
  const keyCount = grouped.length;

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="🌍" title="Traductions IA" desc="Édite tes clés i18n, auto-traduis depuis le FR vers 30+ langues via DeepL ou LLM.">
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Clés uniques" value={keyCount} grad={gradients.purple} />
        <Stat label="Langues" value={langCount} grad={gradients.blue} />
        <Stat label="Valeurs totales" value={total} grad={gradients.pink} />
        <Stat label="Approuvées" value={approved} grad={gradients.green} />
      </section>

      <section style={{ ...card, padding: 12, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="🔍 chercher key/value" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input, width: 240 }} />
        <select value={filterNs} onChange={(e) => setFilterNs(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
          <option value="">Tous namespaces</option>
          {namespaces.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
          <option value="">Toutes langues</option>
          {languages.map((l) => <option key={l} value={l}>{LANG_FLAG[l] || ''} {l}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button style={btnPrimary} onClick={() => setEditing({ namespace: filterNs || 'default', lang: filterLang || 'fr' })}>+ Nouvelle clé</button>
        <button style={btnSecondary} onClick={() => setAutoOpen(true)}>✨ Auto-traduire</button>
        <button style={btnSecondary} onClick={exportJson}>📤 Export JSON</button>
        <label style={{ ...btnSecondary, cursor: 'pointer' }}>📥 Import JSON
          <input type="file" accept=".json" onChange={importJson} style={{ display: 'none' }} />
        </label>
      </section>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
        : grouped.length === 0 ? (
          <div style={{ ...card, padding: 48, textAlign: 'center', opacity: 0.6 }}>
            <div style={{ fontSize: 48 }}>🌐</div>
            <p>Aucune traduction. Crée ta première clé.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {grouped.map((g) => (
              <article key={`${g.ns}::${g.key}`} style={{ ...card, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={pill(colors.secondary)}>{g.ns}</span>
                  <strong style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{g.key}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
                  {Object.values(g.langs).map((t) => (
                    <div key={t.id} style={{ ...card, padding: 8, background: '#0a0a0f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12 }}>{LANG_FLAG[t.lang] || '🌐'} <strong>{t.lang}</strong></span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {t.translatedBy && <span style={pill(colors.violet)} title={`via ${t.translatedBy}`}>auto</span>}
                          <button onClick={() => toggleApproved(t)} style={{ ...miniBtn, color: t.approved ? colors.success : colors.textMuted }}>{t.approved ? '✓ ok' : '○ pending'}</button>
                          <button onClick={() => setEditing(t)} style={miniBtn}>✎</button>
                          <button onClick={() => remove(t)} style={{ ...miniBtn, color: colors.danger }}>×</button>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.4, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{t.value}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouvelle'} traduction</h3>
          {!editing.id && (
            <>
              <Field label="Namespace"><input style={input} value={editing.namespace || 'default'} onChange={(e) => setEditing({ ...editing, namespace: e.target.value })} /></Field>
              <Field label="Clé *"><input style={input} value={editing.key || ''} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="hero.title" /></Field>
              <Field label="Langue *">
                <select style={input} value={editing.lang || 'fr'} onChange={(e) => setEditing({ ...editing, lang: e.target.value })}>
                  {COMMON_LANGS.map((l) => <option key={l} value={l}>{LANG_FLAG[l]} {l}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Valeur *">
            <textarea style={{ ...input, minHeight: 120 }} value={editing.value || ''} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
          </Field>
          <Field label="Contexte (pour les traducteurs)">
            <input style={input} value={editing.context || ''} onChange={(e) => setEditing({ ...editing, context: e.target.value })} placeholder="Ex: bouton CTA homepage" />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" checked={!!editing.approved} onChange={(e) => setEditing({ ...editing, approved: e.target.checked })} />
            <span style={{ fontSize: 13 }}>Marquer approuvé</span>
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => setEditing(null)}>Annuler</button>
            <button style={btnPrimary} onClick={save}>Enregistrer</button>
          </div>
        </Modal>
      )}

      {autoOpen && (
        <AutoTranslateModal orgSlug={orgSlug} availableLangs={languages} namespaces={namespaces} onClose={() => { setAutoOpen(false); load(); }} />
      )}
    </SimpleOrgPage>
  );
}

/* ---- Auto translate modal ---- */
function AutoTranslateModal({ orgSlug, availableLangs, namespaces, onClose }: { orgSlug: string; availableLangs: string[]; namespaces: string[]; onClose: () => void }) {
  const [sourceLang, setSourceLang] = useState('fr');
  const [targetLangs, setTargetLangs] = useState<string[]>(['en']);
  const [namespace, setNamespace] = useState('default');
  const [provider, setProvider] = useState<'llm' | 'deepl'>('llm');
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function run() {
    setBusy(true); setResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/translations/auto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLang, targetLangs, namespace, provider, forceOverwrite }),
      });
      const j = await r.json();
      setResult(j);
    } finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginTop: 0 }}>✨ Auto-traduction batch</h3>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>Prend toutes les clés du namespace dans la langue source, et les traduit vers toutes les langues cibles.</p>
      <Field label="Namespace"><select value={namespace} onChange={(e) => setNamespace(e.target.value)} style={input}>
        {(namespaces.length ? namespaces : ['default']).map((n) => <option key={n} value={n}>{n}</option>)}
      </select></Field>
      <Field label="Langue source"><select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} style={input}>
        {[...new Set([...availableLangs, 'fr', 'en'])].map((l) => <option key={l} value={l}>{l}</option>)}
      </select></Field>
      <Field label="Langues cibles">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['en', 'es', 'pt', 'de', 'it', 'nl', 'ar', 'he', 'tr', 'ru', 'zh', 'ja', 'ko', 'hi'].filter((l) => l !== sourceLang).map((l) => (
            <label key={l} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: targetLangs.includes(l) ? '#d946ef33' : '#27272a',
              border: targetLangs.includes(l) ? '1px solid #d946ef' : '1px solid #3f3f46',
            }}>
              <input type="checkbox" checked={targetLangs.includes(l)} onChange={(e) => {
                setTargetLangs(e.target.checked ? [...targetLangs, l] : targetLangs.filter((x) => x !== l));
              }} style={{ display: 'none' }} />
              {l}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Provider">
        <select value={provider} onChange={(e) => setProvider(e.target.value as any)} style={input}>
          <option value="llm">LLM (Gemini/Claude — utilise ton config IA)</option>
          <option value="deepl">DeepL (clé DEEPL_KEY requise)</option>
        </select>
      </Field>
      <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 12 }}>
        <input type="checkbox" checked={forceOverwrite} onChange={(e) => setForceOverwrite(e.target.checked)} />
        Écraser les valeurs existantes
      </label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={btnSecondary} onClick={onClose}>Fermer</button>
        <button style={btnPrimary} disabled={busy || !targetLangs.length} onClick={run}>{busy ? '⏳ Traduction…' : `⚡ Lancer (${targetLangs.length} langue${targetLangs.length > 1 ? 's' : ''})`}</button>
      </div>

      {result && (
        <div style={{ marginTop: 12, fontSize: 12 }}>
          <div>✓ {result.processed} traduites · ✗ {result.failed} échouées</div>
          {result.results?.length > 0 && <div style={{ marginTop: 6, maxHeight: 140, overflow: 'auto', opacity: 0.7 }}>
            {result.results.slice(0, 50).map((r: any, i: number) => (
              <div key={i}>{r.key} → {r.lang} : {r.ok ? '✓' : (r.skipped || r.failed)}</div>
            ))}
          </div>}
        </div>
      )}
    </Modal>
  );
}

/* ---- helpers ---- */
function Stat({ label, value, grad }: { label: string; value: any; grad: string }) {
  return (
    <div style={{ ...card, padding: 12, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: grad, opacity: 0.07 }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return <label style={{ display: 'block', marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>{children}</label>;
}
function pill(c: string): React.CSSProperties {
  return { background: `${c}22`, color: c, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
}
const miniBtn: React.CSSProperties = { background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 12, padding: '2px 4px' };
function Modal({ children, onClose }: { children: any; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>{children}</div>
    </div>
  );
}
