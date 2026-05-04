'use client';
import { useMemo, useState } from 'react';
import {
  Palette, Sparkles, Loader2, Check, X, Calendar, Filter, Eye, Edit3, Trash2,
  RotateCcw, Save, AlertTriangle, Plus
} from 'lucide-react';

type Theme = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  colors: any;
  fonts: any;
  decorations: any;
  customCss: string | null;
  autoActivate: boolean;
  autoStartMonth: number | null;
  autoStartDay: number | null;
  daysBefore: number;
  durationDays: number;
  holidaySlug: string | null;
  geographicScope: string | null;
  active: boolean;
  priority: number;
};

const CATEGORY_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  holiday:   { label: 'Fêtes',          color: 'fuchsia', emoji: '🎉' },
  religious: { label: 'Religieuses',    color: 'amber',   emoji: '✝️' },
  national:  { label: 'Nationales',     color: 'red',     emoji: '🏳️' },
  aesthetic: { label: 'Esthétiques',    color: 'violet',  emoji: '🎨' },
  seasonal:  { label: 'Saisonnières',   color: 'emerald', emoji: '🌸' }
};

export function ThemesAdmin({ initial }: { initial: Theme[] }) {
  const [themes, setThemes] = useState<Theme[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [editing, setEditing] = useState<Theme | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  async function seedDefaults(wipe: boolean) {
    if (wipe && !confirm('Effacer TOUS les thèmes existants et réinitialiser aux 50 thèmes par défaut ?')) return;
    setBusy('seed');
    try {
      const r = await fetch('/api/admin/themes/seed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipe })
      });
      const j = await r.json();
      if (r.ok) {
        alert(`✅ ${j.stats.created} thèmes créés · ${j.stats.kept} conservés${wipe ? ` · ${j.stats.deleted} effacés` : ''}`);
        window.location.reload();
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setBusy(null); }
  }

  async function activate(theme: Theme) {
    setBusy(theme.id);
    try {
      const r = await fetch(`/api/admin/themes/${theme.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true })
      });
      if (r.ok) {
        setThemes(themes.map(t => ({ ...t, active: t.id === theme.id })));
      }
    } finally { setBusy(null); }
  }

  async function deactivate(theme: Theme) {
    setBusy(theme.id);
    try {
      await fetch(`/api/admin/themes/${theme.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false })
      });
      setThemes(themes.map(t => t.id === theme.id ? { ...t, active: false } : t));
    } finally { setBusy(null); }
  }

  async function toggleAutoActivate(theme: Theme) {
    setBusy(theme.id);
    try {
      const r = await fetch(`/api/admin/themes/${theme.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoActivate: !theme.autoActivate })
      });
      const j = await r.json();
      if (r.ok) setThemes(themes.map(t => t.id === theme.id ? { ...t, autoActivate: !t.autoActivate } : t));
    } finally { setBusy(null); }
  }

  async function remove(theme: Theme) {
    if (!confirm(`Supprimer le thème "${theme.name}" ?`)) return;
    setBusy(theme.id);
    try {
      const r = await fetch(`/api/admin/themes/${theme.id}`, { method: 'DELETE' });
      if (r.ok) setThemes(themes.filter(t => t.id !== theme.id));
    } finally { setBusy(null); }
  }

  async function patch(theme: Theme, data: any) {
    setBusy(theme.id);
    try {
      const r = await fetch(`/api/admin/themes/${theme.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await r.json();
      if (r.ok && j.theme) {
        setThemes(themes.map(t => t.id === theme.id ? j.theme : t));
        setEditing(null);
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setBusy(null); }
  }

  const filtered = useMemo(() => filter ? themes.filter(t => t.category === filter) : themes, [themes, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of themes) c[t.category] = (c[t.category] || 0) + 1;
    return c;
  }, [themes]);
  const activeTheme = themes.find(t => t.active);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-500 rounded-xl p-3 shadow-lg shadow-fuchsia-500/30">
            <Palette size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold leading-none">Thèmes saisonniers</h1>
            <p className="text-zinc-400 text-xs mt-1">{themes.length} thèmes · {Object.entries(counts).map(([c, n]) => `${CATEGORY_LABELS[c]?.emoji} ${n}`).join(' · ')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {themes.length === 0 ? (
            <button onClick={() => seedDefaults(false)} disabled={busy === 'seed'} className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2">
              {busy === 'seed' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Seed 50 thèmes par défaut
            </button>
          ) : (
            <>
              <button onClick={() => seedDefaults(false)} disabled={busy === 'seed'} className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5">
                {busy === 'seed' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Ajouter manquants
              </button>
              <button onClick={() => seedDefaults(true)} disabled={busy === 'seed'} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5">
                <RotateCcw size={12} />Reset complet
              </button>
            </>
          )}
        </div>
      </header>

      {/* Thème actif courant */}
      {activeTheme && (
        <section className="bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10 border border-fuchsia-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border-2 border-white/20" style={{ background: `linear-gradient(135deg, ${activeTheme.colors?.primary}, ${activeTheme.colors?.secondary})` }} />
            <div>
              <div className="text-xs uppercase font-bold text-fuchsia-300">Thème actif maintenant</div>
              <div className="font-bold text-lg">{activeTheme.name}</div>
              <div className="text-[11px] text-zinc-400">{activeTheme.description}</div>
            </div>
          </div>
          <button onClick={() => deactivate(activeTheme)} disabled={busy === activeTheme.id} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5">
            <X size={12} /> Désactiver
          </button>
        </section>
      )}

      {/* Filtres catégorie */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${!filter ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
          Tous ({themes.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, c]) => (
          <button key={key} onClick={() => setFilter(filter === key ? '' : key)} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${filter === key ? `bg-${c.color}-500 text-white` : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            <span>{c.emoji}</span> {c.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {/* Grid de thèmes */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(t => (
          <ThemeCard
            key={t.id}
            theme={t}
            busy={busy === t.id}
            isPreview={previewing === t.id}
            onActivate={() => activate(t)}
            onDeactivate={() => deactivate(t)}
            onAutoToggle={() => toggleAutoActivate(t)}
            onRemove={() => remove(t)}
            onEdit={() => setEditing(t)}
            onPreview={() => setPreviewing(previewing === t.id ? null : t.id)}
          />
        ))}
      </div>

      {/* Modale édition */}
      {editing && <EditModal theme={editing} onSave={(d) => patch(editing, d)} onClose={() => setEditing(null)} busy={busy === editing.id} />}
    </div>
  );
}

function ThemeCard({ theme, busy, isPreview, onActivate, onDeactivate, onAutoToggle, onRemove, onEdit, onPreview }: any) {
  const c = theme.colors || {};
  const cat = CATEGORY_LABELS[theme.category];
  const decorations = theme.decorations || {};
  const decoCount = Object.values(decorations).filter(Boolean).length;

  return (
    <div className={`bg-zinc-900 border-2 rounded-2xl overflow-hidden transition ${theme.active ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : isPreview ? 'border-fuchsia-500' : 'border-zinc-800 hover:border-zinc-700'}`}>
      {/* Preview color band */}
      <div
        className="h-24 relative cursor-pointer"
        style={{ background: `linear-gradient(135deg, ${c.primary || '#d61b80'} 0%, ${c.secondary || '#7c3aed'} 50%, ${c.accent || '#06b6d4'} 100%)` }}
        onClick={onPreview}
      >
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-[9px] font-bold bg-black/40 backdrop-blur px-1.5 py-0.5 rounded-full">{cat?.emoji} {cat?.label}</span>
          {theme.priority > 0 && <span className="text-[9px] font-bold bg-amber-500/80 text-white px-1.5 py-0.5 rounded-full">P{theme.priority}</span>}
        </div>
        {theme.active && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check size={10} /> ACTIF
          </div>
        )}
        {decoCount > 0 && (
          <div className="absolute bottom-2 right-2 text-[9px] bg-black/40 backdrop-blur px-1.5 py-0.5 rounded-full">
            ✨ {decoCount} effets
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div>
          <div className="font-bold text-sm truncate">{theme.name}</div>
          <div className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{theme.description}</div>
        </div>

        {/* Color swatches */}
        <div className="flex gap-1">
          {[c.primary, c.secondary, c.accent, c.bg, c.fg].filter(Boolean).map((color: string, i: number) => (
            <span key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ background: color }} title={color} />
          ))}
        </div>

        {/* Auto activation info */}
        {theme.autoActivate && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-1.5 text-[10px] text-amber-200 flex items-center gap-1">
            <Calendar size={10} /> Auto · {theme.daysBefore}j avant {theme.holidaySlug || `${theme.autoStartDay}/${theme.autoStartMonth}`} · {theme.durationDays}j
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          {theme.active ? (
            <button onClick={onDeactivate} disabled={busy} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-1.5 rounded-full flex items-center justify-center gap-1">
              {busy ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />} Désactiver
            </button>
          ) : (
            <button onClick={onActivate} disabled={busy} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-full flex items-center justify-center gap-1">
              {busy ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Activer
            </button>
          )}
          <button onClick={onAutoToggle} disabled={busy} className={`px-2 py-1.5 rounded-full text-[10px] ${theme.autoActivate ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`} title={theme.autoActivate ? 'Auto activé' : 'Auto désactivé'}>
            <Calendar size={10} />
          </button>
          <button onClick={onEdit} className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 px-2 py-1.5 rounded-full" title="Modifier">
            <Edit3 size={10} />
          </button>
          <button onClick={onRemove} disabled={busy} className="text-zinc-500 hover:text-red-400 px-2 py-1.5" title="Supprimer">
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ theme, onSave, onClose, busy }: { theme: Theme; onSave: (d: any) => void; onClose: () => void; busy: boolean }) {
  const [data, setData] = useState({
    name: theme.name,
    description: theme.description || '',
    primary: theme.colors?.primary || '#d61b80',
    secondary: theme.colors?.secondary || '#7c3aed',
    accent: theme.colors?.accent || '#06b6d4',
    bg: theme.colors?.bg || '#0a0a14',
    fg: theme.colors?.fg || '#ffffff',
    customCss: theme.customCss || '',
    daysBefore: theme.daysBefore,
    durationDays: theme.durationDays,
    priority: theme.priority,
    autoActivate: theme.autoActivate,
    holidaySlug: theme.holidaySlug || '',
    decorations: theme.decorations || {}
  });

  const DECORATIONS_LIST = ['snow', 'hearts', 'confetti', 'petals', 'fireworks', 'bubbles', 'leaves', 'stars', 'pumpkins', 'eggs', 'lanterns', 'diamonds', 'rainbow'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><Edit3 size={16} /> Personnaliser : {theme.name}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={18} /></button>
        </header>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nom"><input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>
            <Field label="Slug fête (auto-activation)"><input value={data.holidaySlug} onChange={(e) => setData({ ...data, holidaySlug: e.target.value })} placeholder="ex: noel, paques, halloween" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" /></Field>
          </div>
          <Field label="Description"><textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>

          <div>
            <span className="text-[10px] uppercase text-zinc-500 font-bold mb-2 block">Couleurs</span>
            <div className="grid grid-cols-5 gap-2">
              {(['primary', 'secondary', 'accent', 'bg', 'fg'] as const).map(k => (
                <label key={k} className="block text-center">
                  <span className="text-[10px] text-zinc-400 mb-1 block">{k}</span>
                  <input type="color" value={(data as any)[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer" />
                  <span className="text-[9px] text-zinc-500 font-mono block mt-1">{(data as any)[k]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase text-zinc-500 font-bold mb-2 block">Effets / décorations animées</span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {DECORATIONS_LIST.map(d => (
                <label key={d} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs cursor-pointer ${(data.decorations as any)[d] ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'bg-zinc-950 text-zinc-500 hover:bg-zinc-800'}`}>
                  <input type="checkbox" checked={!!(data.decorations as any)[d]} onChange={(e) => setData({ ...data, decorations: { ...data.decorations, [d]: e.target.checked } })} />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Jours avant fête"><input type="number" value={data.daysBefore} onChange={(e) => setData({ ...data, daysBefore: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>
            <Field label="Durée (jours)"><input type="number" value={data.durationDays} onChange={(e) => setData({ ...data, durationDays: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>
            <Field label="Priorité"><input type="number" value={data.priority} onChange={(e) => setData({ ...data, priority: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>
          </div>

          <Field label="Custom CSS (avancé)"><textarea value={data.customCss} onChange={(e) => setData({ ...data, customCss: e.target.value })} rows={5} placeholder="body { background: ... }" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" /></Field>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={data.autoActivate} onChange={(e) => setData({ ...data, autoActivate: e.target.checked })} />
            Activation automatique en fonction de la date de la fête
          </label>
        </div>
        <footer className="p-4 border-t border-zinc-800 flex gap-2">
          <button onClick={() => onSave({
            name: data.name,
            description: data.description,
            colors: { primary: data.primary, secondary: data.secondary, accent: data.accent, bg: data.bg, fg: data.fg },
            decorations: data.decorations,
            customCss: data.customCss,
            daysBefore: data.daysBefore,
            durationDays: data.durationDays,
            priority: data.priority,
            autoActivate: data.autoActivate,
            holidaySlug: data.holidaySlug || null
          })} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-full">Annuler</button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">{label}</span>
      {children}
    </label>
  );
}
