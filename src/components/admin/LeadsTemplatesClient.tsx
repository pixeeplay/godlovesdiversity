'use client';
import { useEffect, useState } from 'react';
import {
  Mail, MessageCircle, Plus, Save, Trash2, Sparkles, Loader2, Copy, Check, X
} from 'lucide-react';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  variables: string[];
  language: string;
  category: string | null;
  active: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_META: Record<string, { color: string; label: string; icon: any }> = {
  'b2b-email':    { color: 'cyan',    label: 'Email B2B',    icon: Mail },
  'b2c-dm-insta': { color: 'rose',    label: 'DM Instagram', icon: MessageCircle },
  newsletter:     { color: 'fuchsia', label: 'Newsletter',   icon: Mail },
  reply:          { color: 'violet',  label: 'Réponse',      icon: Mail }
};

export function LeadsTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Template | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/leads/templates', { cache: 'no-store' });
    const j = await r.json();
    setTemplates(j.templates || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function seed() {
    if (!confirm('Importer les templates par défaut (B2B + DM Insta + Newsletter) ?')) return;
    const r = await fetch('/api/admin/leads/templates/seed', { method: 'POST' });
    const j = await r.json();
    if (j.ok) {
      alert(`✓ ${j.created} créés, ${j.skipped} déjà existants`);
      load();
    } else {
      alert('Erreur : ' + (j.error || 'unknown'));
    }
  }

  async function save(t: Template) {
    const r = await fetch('/api/admin/leads/templates', {
      method: t.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t)
    });
    if (r.ok) {
      setEditing(null);
      load();
    } else {
      alert('Erreur de sauvegarde');
    }
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce template ?')) return;
    await fetch(`/api/admin/leads/templates?id=${id}`, { method: 'DELETE' });
    load();
  }

  function copyBody(t: Template) {
    navigator.clipboard.writeText(t.body);
    setCopied(t.id);
    setTimeout(() => setCopied(null), 1500);
  }

  function newTemplate(type: string) {
    setEditing({
      id: '',
      name: 'Nouveau template',
      type,
      subject: type === 'b2c-dm-insta' ? null : 'Sujet',
      body: '',
      variables: [],
      language: 'fr',
      category: null,
      active: true,
      usageCount: 0,
      createdAt: '',
      updatedAt: ''
    });
  }

  const filtered = filter === 'all' ? templates : templates.filter((t) => t.type === filter);

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-fuchsia-600 to-violet-600 rounded-2xl p-5 mb-4 ring-1 ring-white/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">📧</div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-black text-white tracking-tight">Templates emails / DM</h1>
            <p className="text-white/85 text-sm mt-0.5">Réutilisables pour la prospection B2B + B2C — variables {'{{firstName}}'}…</p>
          </div>
          <button onClick={seed} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5">
            <Sparkles size={12} /> Importer défauts
          </button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Link href="/admin/leads" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">🎯</div><p className="text-xs font-bold text-white">Leads</p>
        </Link>
        <Link href="/admin/leads/scraper" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">🕷️</div><p className="text-xs font-bold text-white">Scraper</p>
        </Link>
        <Link href="/admin/leads/scraper/new" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">✨</div><p className="text-xs font-bold text-white">Wizard</p>
        </Link>
        <Link href="/admin/leads/templates" className="bg-fuchsia-500/10 ring-1 ring-fuchsia-500/40 rounded-xl p-3 text-center">
          <div className="text-xl mb-1">📧</div><p className="text-xs font-bold text-fuchsia-300">Templates</p>
        </Link>
        <Link href="/admin/leads/legal" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-amber-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">⚖️</div><p className="text-xs font-bold text-white">Légal</p>
        </Link>
      </div>

      {/* Filter + new */}
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {[{ v: 'all', l: 'Tous' }, { v: 'b2b-email', l: 'B2B Email' }, { v: 'b2c-dm-insta', l: 'DM Insta' }, { v: 'newsletter', l: 'Newsletter' }, { v: 'reply', l: 'Réponse' }].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={`text-xs px-3 py-1.5 rounded-full ${filter === f.v ? 'bg-fuchsia-500 text-white' : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800'}`}>{f.l}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => newTemplate('b2b-email')} className="text-xs bg-cyan-500 hover:bg-cyan-400 text-white px-3 py-1.5 rounded-full flex items-center gap-1"><Plus size={11} /> B2B</button>
          <button onClick={() => newTemplate('b2c-dm-insta')} className="text-xs bg-rose-500 hover:bg-rose-400 text-white px-3 py-1.5 rounded-full flex items-center gap-1"><Plus size={11} /> DM Insta</button>
          <button onClick={() => newTemplate('newsletter')} className="text-xs bg-fuchsia-500 hover:bg-fuchsia-400 text-white px-3 py-1.5 rounded-full flex items-center gap-1"><Plus size={11} /> Newsletter</button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-xs text-zinc-500 text-center py-8 flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" /> Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-12 text-center">
          <Mail size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-300 font-bold mb-1">Aucun template</p>
          <p className="text-xs text-zinc-500 mb-4">Importe les templates par défaut ou crée le tien</p>
          <button onClick={seed} className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5">
            <Sparkles size={12} /> Importer les défauts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const meta = TYPE_META[t.type] || TYPE_META['b2b-email'];
            const Icon = meta.icon;
            return (
              <article key={t.id} className="bg-zinc-900 ring-1 ring-zinc-800 hover:ring-fuchsia-500/40 rounded-2xl p-3 transition">
                <header className="flex items-start gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-${meta.color}-500/15 text-${meta.color}-400 flex items-center justify-center`}><Icon size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{t.name}</h3>
                    <p className="text-[10px] text-zinc-500">
                      <span className={`text-${meta.color}-400`}>{meta.label}</span>
                      {t.category && <> · {t.category}</>}
                      {t.usageCount > 0 && <> · {t.usageCount} envois</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => copyBody(t)} className="p-1.5 text-zinc-500 hover:text-zinc-200" title="Copier">
                      {copied === t.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <button onClick={() => setEditing(t)} className="p-1.5 text-zinc-500 hover:text-zinc-200" title="Éditer">✏️</button>
                    <button onClick={() => del(t.id)} className="p-1.5 text-rose-400 hover:text-rose-300" title="Supprimer"><Trash2 size={12} /></button>
                  </div>
                </header>
                {t.subject && <p className="text-xs font-bold text-zinc-300 truncate">{t.subject}</p>}
                <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap line-clamp-5 bg-zinc-950 rounded p-2 mt-1 font-sans">{t.body}</pre>
                {t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.variables.slice(0, 8).map((v) => (
                      <code key={v} className="text-[9px] bg-fuchsia-500/15 text-fuchsia-300 px-1.5 py-0.5 rounded">{`{{${v}}}`}</code>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      {editing && <TemplateEditor template={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TemplateEditor({ template, onSave, onClose }: {
  template: Template; onSave: (t: Template) => void; onClose: () => void;
}) {
  const [t, setT] = useState(template);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-fuchsia-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <header className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">{t.id ? 'Éditer' : 'Nouveau'} template</h3>
          <select value={t.type} onChange={(e) => setT({ ...t, type: e.target.value })} className="ml-2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs">
            <option value="b2b-email">Email B2B</option>
            <option value="b2c-dm-insta">DM Insta B2C</option>
            <option value="newsletter">Newsletter</option>
            <option value="reply">Réponse</option>
          </select>
          <button onClick={onClose} className="ml-auto text-zinc-400 hover:text-white"><X size={16} /></button>
        </header>
        <div className="p-4 overflow-y-auto space-y-2">
          <input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Nom interne" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold" />
          {t.type !== 'b2c-dm-insta' && (
            <input value={t.subject || ''} onChange={(e) => setT({ ...t, subject: e.target.value })} placeholder="Sujet de l'email" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
          )}
          <textarea value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} rows={14} placeholder="Corps du message — utilise {{firstName}} pour les variables" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          <div className="grid grid-cols-2 gap-2">
            <input value={t.category || ''} onChange={(e) => setT({ ...t, category: e.target.value })} placeholder="Catégorie (wedding-b2b)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
            <input value={t.variables.join(',')} onChange={(e) => setT({ ...t, variables: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Variables (firstName,city,...)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} /> Actif
          </label>
        </div>
        <footer className="bg-zinc-900 border-t border-zinc-800 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-white px-3 py-1.5">Annuler</button>
          <button onClick={() => onSave(t)} className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1"><Save size={11} /> Enregistrer</button>
        </footer>
      </div>
    </div>
  );
}
