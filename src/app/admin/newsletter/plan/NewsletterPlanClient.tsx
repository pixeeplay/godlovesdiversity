'use client';
import { useEffect, useState } from 'react';
import { Calendar, Sparkles, Image as ImageIcon, Video, Send, Loader2, RefreshCw, Edit, X, Save, CheckCircle2 } from 'lucide-react';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function NewsletterPlanClient() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/admin/ai/newsletter/plan?year=${year}`).then((r) => r.json()).catch(() => ({ items: [] }));
    setItems(r.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [year]);

  async function generatePlan(regenerate = false) {
    setGenerating(true);
    const r = await fetch('/api/admin/ai/newsletter/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, regenerate })
    });
    const j = await r.json();
    setGenerating(false);
    alert(j.ok ? `✓ ${j.created} newsletters planifiées (${j.skipped} skip)` : `⚠ ${j.error}`);
    load();
  }

  async function callAction(id: string, action: string) {
    setActionLoading(`${id}-${action}`);
    const r = await fetch(`/api/admin/ai/newsletter/plan/${id}?action=${action}`, { method: 'POST' });
    const j = await r.json();
    setActionLoading(null);
    if (j.ok && j.item) {
      setItems((arr) => arr.map((x) => (x.id === id ? j.item : x)));
      if (editingItem?.id === id) setEditingItem(j.item);
    } else if (j.note) {
      alert(j.note);
      load();
    } else {
      alert(j.error || 'Erreur');
    }
  }

  async function saveEdit() {
    if (!editingItem) return;
    setActionLoading('save');
    const r = await fetch(`/api/admin/ai/newsletter/plan/${editingItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editingItem.title,
        theme: editingItem.theme,
        subject: editingItem.subject,
        preheader: editingItem.preheader,
        htmlContent: editingItem.htmlContent,
        imagePrompt: editingItem.imagePrompt
      })
    });
    const j = await r.json();
    setActionLoading(null);
    if (j.item) {
      setItems((arr) => arr.map((x) => (x.id === j.item.id ? j.item : x)));
      setEditingItem(null);
    }
  }

  function isMonth(month: number) {
    return (item: any) => new Date(item.scheduledFor).getMonth() === month;
  }

  const stats = {
    total: items.length,
    ready: items.filter((i) => i.status === 'ready').length,
    sent: items.filter((i) => i.status === 'sent').length,
    drafts: items.filter((i) => i.status === 'draft').length,
    withImage: items.filter((i) => i.imageUrl).length,
    edited: items.filter((i) => i.manuallyEdited).length
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-3">
            <Calendar className="text-cyan-400" /> Plan Newsletter Annuel
          </h1>
          <p className="text-sm text-zinc-400 mt-1">52 newsletters planifiées par IA · édite et génère contenu/image/vidéo à la demande.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm">
            {[year - 1, year, year + 1, year + 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => load()} disabled={loading} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-xs flex items-center gap-1.5">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
          <button onClick={() => generatePlan(false)} disabled={generating} className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold px-3 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Planifier l'année
          </button>
          <button onClick={() => { if (confirm('⚠ Régénère tous les titres (sauf ceux édités manuellement) ?')) generatePlan(true); }} disabled={generating} className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 px-3 py-2 rounded text-xs flex items-center gap-1">
            🔄 Régénérer titres
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Planifiées" value={stats.total} color="cyan" />
        <Stat label="Brouillons" value={stats.drafts} color="zinc" />
        <Stat label="Prêtes" value={stats.ready} color="emerald" />
        <Stat label="Envoyées" value={stats.sent} color="violet" />
        <Stat label="Avec image" value={stats.withImage} color="fuchsia" />
        <Stat label="Éditées" value={stats.edited} color="amber" />
      </div>

      {/* CALENDRIER 12 MOIS */}
      {items.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-12 text-center text-zinc-400">
          <Calendar size={32} className="mx-auto mb-3 opacity-50" />
          <p className="font-bold">Aucune newsletter planifiée pour {year}</p>
          <p className="text-xs text-zinc-500 mt-2">Clique « Planifier l'année » pour générer 52 newsletters via IA.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MONTHS.map((m, i) => {
            const monthItems = items.filter(isMonth(i));
            if (!monthItems.length) return null;
            return (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-800/70 px-3 py-2 font-bold text-sm flex items-center justify-between">
                  <span>{m} {year}</span>
                  <span className="text-[10px] text-zinc-400">{monthItems.length} newsletter{monthItems.length > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-zinc-800">
                  {monthItems.map((item) => (
                    <NewsletterRow
                      key={item.id}
                      item={item}
                      actionLoading={actionLoading}
                      onEdit={() => setEditingItem(item)}
                      onAction={callAction}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE D'ÉDITION */}
      {editingItem && (
        <Modal onClose={() => setEditingItem(null)}>
          <h2 className="font-bold text-xl mb-1">{editingItem.title}</h2>
          <p className="text-xs text-zinc-400 mb-4">
            Semaine {editingItem.weekNumber} · {new Date(editingItem.scheduledFor).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Titre">
                <input value={editingItem.title || ''} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
              </Field>
              <Field label="Thème">
                <input value={editingItem.theme || ''} onChange={(e) => setEditingItem({ ...editingItem, theme: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
              </Field>
            </div>
            <Field label="Sujet de l'email">
              <input value={editingItem.subject || ''} onChange={(e) => setEditingItem({ ...editingItem, subject: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
            </Field>
            <Field label="Preheader (preview email)">
              <input value={editingItem.preheader || ''} onChange={(e) => setEditingItem({ ...editingItem, preheader: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
            </Field>
            <Field label="Corps HTML (généré par IA, modifiable)">
              <textarea value={editingItem.htmlContent || ''} onChange={(e) => setEditingItem({ ...editingItem, htmlContent: e.target.value })} rows={8} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono" />
            </Field>

            {editingItem.imageUrl && (
              <div className="bg-zinc-950 rounded-lg p-3">
                <label className="text-[10px] uppercase font-bold text-zinc-400 mb-2 block">Image IA actuelle</label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editingItem.imageUrl} alt="" className="w-full max-h-64 object-contain rounded" />
              </div>
            )}

            <Field label="Prompt image IA">
              <textarea value={editingItem.imagePrompt || ''} onChange={(e) => setEditingItem({ ...editingItem, imagePrompt: e.target.value })} rows={2} placeholder="(défaut généré auto si vide)" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs" />
            </Field>

            <div className="flex items-center gap-2 pt-3 border-t border-zinc-800 flex-wrap">
              <button onClick={() => callAction(editingItem.id, 'generate-html')} disabled={!!actionLoading} className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 px-3 py-2 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                {actionLoading === `${editingItem.id}-generate-html` ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Générer HTML
              </button>
              <button onClick={() => callAction(editingItem.id, 'generate-image')} disabled={!!actionLoading} className="bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-fuchsia-200 px-3 py-2 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                {actionLoading === `${editingItem.id}-generate-image` ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} Générer image
              </button>
              <button onClick={() => callAction(editingItem.id, 'generate-video')} disabled={!!actionLoading} className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 px-3 py-2 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                <Video size={12} /> Vidéo (prompt only)
              </button>
              <div className="ml-auto flex gap-2">
                <button onClick={() => setEditingItem(null)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-xs">Annuler</button>
                <button onClick={saveEdit} disabled={!!actionLoading} className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded text-xs font-bold flex items-center gap-1">
                  {actionLoading === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Sauvegarder
                </button>
                {editingItem.status === 'ready' && (
                  <button onClick={() => callAction(editingItem.id, 'send')} disabled={!!actionLoading} className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-1">
                    <Send size={12} /> Créer campagne
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewsletterRow({ item, actionLoading, onEdit, onAction }: any) {
  const date = new Date(item.scheduledFor);
  const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  const statusColor: any = {
    draft: 'bg-zinc-700 text-zinc-300',
    ready: 'bg-emerald-500/20 text-emerald-300',
    sent: 'bg-violet-500/20 text-violet-300',
    skipped: 'bg-rose-500/20 text-rose-300'
  };
  return (
    <div className="px-3 py-2.5 hover:bg-zinc-800/50 cursor-pointer text-xs" onClick={onEdit}>
      <div className="flex items-start gap-2">
        <div className="w-12 flex-shrink-0">
          <div className="text-[10px] text-zinc-500 uppercase">{dayLabel.split(' ')[0]}</div>
          <div className="font-bold">{dayLabel.split(' ')[1]}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{item.title}</div>
          {item.theme && <div className="text-[10px] text-zinc-500 truncate">{item.theme}</div>}
          <div className="flex gap-1 mt-1">
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${statusColor[item.status]}`}>{item.status}</span>
            {item.imageUrl && <span className="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 px-1.5 py-0.5 rounded">🖼</span>}
            {item.videoPrompt && <span className="text-[9px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">🎬</span>}
            {item.manuallyEdited && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">✎</span>}
          </div>
        </div>
        <Edit size={12} className="text-zinc-500 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: any = {
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    zinc: 'border-zinc-700 bg-zinc-800/30 text-zinc-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    fuchsia: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  };
  return (
    <div className={`border rounded-lg p-3 ${colors[color]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] uppercase opacity-80">{label}</div>
    </div>
  );
}

function Modal({ children, onClose }: { children: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl w-full p-6 my-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-zinc-800 rounded">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
