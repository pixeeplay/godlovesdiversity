'use client';
/**
 * OrgEmailTemplatesClient — CRUD email templates avec preview + variables substitution + test send.
 * Utilise la table EmailTemplate du tenant (id, name, type, subject, body, variables, active).
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, Trash2, X, Mail, Send, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

type Template = {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  variables: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const TYPE_OPTIONS = [
  { id: 'welcome', label: 'Welcome', emoji: '👋' },
  { id: 'newsletter', label: 'Newsletter', emoji: '📰' },
  { id: 'reset', label: 'Reset password', emoji: '🔑' },
  { id: 'b2b-email', label: 'Cold email B2B', emoji: '🎯' },
  { id: 'b2c-dm-insta', label: 'DM Instagram B2C', emoji: '💬' },
  { id: 'transactional', label: 'Transactionnel', emoji: '📦' },
  { id: 'drip', label: 'Drip campaign', emoji: '💧' },
  { id: 'custom', label: 'Custom', emoji: '🛠️' },
];

export function OrgEmailTemplatesClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [seedBusy, setSeedBusy] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    const r = await fetch(`/api/orgs/${orgSlug}/email-templates?${params}`, { cache: 'no-store' });
    const j = await r.json();
    setItems(j.templates || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterType]);

  async function seed() {
    setSeedBusy(true);
    await fetch(`/api/orgs/${orgSlug}/email-templates/seed`, { method: 'POST' });
    setSeedBusy(false);
    load();
  }

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-7xl mx-auto">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">📧 Templates emails</h1>
          <p className="text-sm text-zinc-400">Cold mail, transactionnels, drip campaigns. Variables {`{{firstName}}`} substituées au send.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200">
            <option value="">Tous types</option>
            {TYPE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
          </select>
          <button onClick={seed} disabled={seedBusy} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
            {seedBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Seed templates
          </button>
          <button onClick={() => setCreating(true)} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Plus size={12} /> Nouveau
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center py-8 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Chargement…</p>
      ) : items.length === 0 ? (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-12 text-center">
          <Mail size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-300 font-bold mb-1">Aucun template</p>
          <p className="text-xs text-zinc-500 mb-4">Crée-en un ou utilise les templates préfaits.</p>
          <button onClick={seed} disabled={seedBusy} className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg inline-flex items-center gap-1.5">
            <Sparkles size={14} /> Seed 5 templates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((t) => {
            const typeMeta = TYPE_OPTIONS.find((x) => x.id === t.type);
            return (
              <article key={t.id} className="bg-zinc-900 ring-1 ring-zinc-800 hover:ring-zinc-700 rounded-2xl p-4 transition cursor-pointer" onClick={() => setEditing(t)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-zinc-100 truncate">{t.name}</div>
                    {t.subject && <div className="text-xs text-zinc-400 truncate mt-0.5">↳ {t.subject}</div>}
                  </div>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${t.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-700 text-zinc-400'}`}>
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 mb-2">
                  {typeMeta && <span>{typeMeta.emoji} {typeMeta.label}</span>}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-3 mb-2 whitespace-pre-line">{t.body.slice(0, 200)}</p>
                {t.variables && t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {t.variables.slice(0, 5).map((v) => (
                      <span key={v} className="text-[9px] bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded-full">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <TemplateEditor
          orgSlug={orgSlug}
          template={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ orgSlug, template, onClose, onSaved }: {
  orgSlug: string; template: Template | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [type, setType] = useState(template?.type || 'b2b-email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [active, setActive] = useState(template?.active !== false);
  const [tab, setTab] = useState<'edit' | 'preview' | 'test'>('edit');
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string | null>(null);

  // Auto-detect variables {{xxx}}
  const detectedVars = useMemo(() => {
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const set = new Set<string>();
    for (const src of [subject, body]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(src || ''))) set.add(m[1]);
    }
    return Array.from(set);
  }, [subject, body]);

  function substitute(text: string): string {
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name) => previewVars[name] || `{{${name}}}`);
  }

  async function save() {
    setBusy(true);
    const variables = detectedVars;
    if (template) {
      await fetch(`/api/orgs/${orgSlug}/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, subject, body, variables, active })
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/email-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, subject, body, variables, active })
      });
    }
    setBusy(false);
    onSaved();
  }

  async function remove() {
    if (!template || !confirm('Supprimer ce template ?')) return;
    await fetch(`/api/orgs/${orgSlug}/email-templates/${template.id}`, { method: 'DELETE' });
    onSaved();
  }

  async function sendTest() {
    if (!testTo) return;
    setBusy(true);
    setTestResult(null);
    const r = await fetch(`/api/orgs/${orgSlug}/email-templates/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testTo, subject: substitute(subject), body: substitute(body) })
    });
    const j = await r.json();
    setTestResult(r.ok ? 'Envoyé ✓' : (j.error || 'Erreur'));
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-zinc-100">{template ? 'Éditer template' : 'Nouveau template'}</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-400 hover:text-white" /></button>
        </div>

        <div className="flex items-center gap-1 mb-3 border-b border-zinc-800">
          <button onClick={() => setTab('edit')} className={`px-3 py-2 text-xs font-bold ${tab === 'edit' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-zinc-400'}`}>Éditer</button>
          <button onClick={() => setTab('preview')} className={`px-3 py-2 text-xs font-bold flex items-center gap-1 ${tab === 'preview' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-zinc-400'}`}><Eye size={11} /> Preview</button>
          <button onClick={() => setTab('test')} className={`px-3 py-2 text-xs font-bold flex items-center gap-1 ${tab === 'test' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-zinc-400'}`}><Send size={11} /> Test send</button>
        </div>

        {tab === 'edit' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du template" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100" />
              <select value={type} onChange={(e) => setType(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200">
                {TYPE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet (peut contenir {{variable}})" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} placeholder="Body — utilise {{firstName}}, {{company}}, {{unsubscribeUrl}}, …" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono leading-relaxed" />
            {detectedVars.length > 0 && (
              <div className="text-xs text-zinc-400">
                <span className="font-bold text-zinc-300">Variables détectées :</span>{' '}
                {detectedVars.map((v) => <span key={v} className="inline-block mr-1 bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>)}
              </div>
            )}
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-emerald-500" />
              Template actif (utilisable dans les campagnes / sends)
            </label>
          </div>
        )}

        {tab === 'preview' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">Renseigne des valeurs de test pour les variables pour voir le rendu.</p>
            {detectedVars.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {detectedVars.map((v) => (
                  <label key={v} className="block">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">{v}</div>
                    <input value={previewVars[v] || ''} onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200" />
                  </label>
                ))}
              </div>
            ) : <p className="text-xs text-zinc-500">Aucune variable détectée dans le template.</p>}

            <div className="border-t border-zinc-800 pt-3 mt-3">
              <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Rendu</div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                {subject && <div className="font-bold text-sm text-zinc-100 mb-2">Sujet : {substitute(subject)}</div>}
                <pre className="whitespace-pre-wrap text-xs text-zinc-200 font-sans">{substitute(body)}</pre>
              </div>
            </div>
          </div>
        )}

        {tab === 'test' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">Envoie ce template à une adresse pour vérifier le rendu réel (via Resend).</p>
            <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="destinataire@example.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100" />
            <div className="grid grid-cols-2 gap-2">
              {detectedVars.map((v) => (
                <label key={v} className="block">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">{v}</div>
                  <input value={previewVars[v] || ''} onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200" />
                </label>
              ))}
            </div>
            {testResult && (
              <div className={`text-xs rounded p-2 ${testResult.includes('✓') ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                {testResult}
              </div>
            )}
            <button onClick={sendTest} disabled={busy || !testTo} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm py-2 px-4 rounded-lg flex items-center gap-1.5">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Envoyer test
            </button>
          </div>
        )}

        <div className="flex justify-between pt-3 mt-3 border-t border-zinc-800">
          {template ? (
            <button onClick={remove} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><Trash2 size={11} /> Supprimer</button>
          ) : <span />}
          <button onClick={save} disabled={busy || !name || !body} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
