'use client';
import { useEffect, useState } from 'react';
import { Loader2, BookOpen, Plus, ThumbsUp, Send, X } from 'lucide-react';

const SCRIPTURES = [
  { id: 'bible',              label: 'Bible',                emoji: '✝️', faiths: ['christian'] },
  { id: 'quran',              label: 'Coran',                emoji: '☪️', faiths: ['muslim'] },
  { id: 'talmud',             label: 'Tanakh / Talmud',      emoji: '✡️', faiths: ['jewish'] },
  { id: 'tipitaka',           label: 'Tipitaka (Sûtras)',    emoji: '☸️', faiths: ['buddhist'] },
  { id: 'vedas',              label: 'Vedas / Bhagavad Gita',emoji: '🕉️', faiths: ['hindu'] },
  { id: 'guru-granth-sahib',  label: 'Guru Granth Sahib',    emoji: '☬',  faiths: ['sikh'] }
];

const PERSPECTIVES = [
  { id: 'queer-theology', label: 'Théologie queer' },
  { id: 'feminist',       label: 'Féministe' },
  { id: 'liberation',     label: 'Libération' },
  { id: 'personal-witness', label: 'Témoignage personnel' }
];

export function TextesSacresClient() {
  const [scripture, setScripture] = useState<string>('bible');
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ reference: '', passageText: '', annotation: '', faith: 'christian', perspective: '', authorName: '', authorRole: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/sacred-annotations?scripture=${scripture}`);
      const j = await r.json();
      setAnnotations(j.annotations || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [scripture]);

  async function submit() {
    setSubmitting(true);
    setMsg(null);
    try {
      const r = await fetch('/api/sacred-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, scripture })
      });
      const j = await r.json();
      if (r.ok) {
        setMsg('✓ Annotation publiée');
        setForm({ reference: '', passageText: '', annotation: '', faith: 'christian', perspective: '', authorName: '', authorRole: '' });
        setShowAdd(false);
        load();
      } else {
        setMsg(`⚠ ${j.error || j.reason}`);
      }
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setSubmitting(false);
  }

  async function upvote(id: string) {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, upvotes: (a.upvotes || 0) + 1, _voted: true } : a));
    try { await fetch('/api/sacred-annotations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'upvote' }) }); } catch {}
  }

  const currentScripture = SCRIPTURES.find(s => s.id === scripture)!;

  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-amber-500 via-rose-500 to-violet-500 rounded-2xl p-3 mb-3">
          <BookOpen size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Textes sacrés inclusifs</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl mx-auto">
          Le « Genius » des textes sacrés. Annotations communautaires inclusives sur Bible, Coran, Talmud, Suttas, Vedas, Guru Granth Sahib.
        </p>
      </header>

      {/* Sélecteur Scripture */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {SCRIPTURES.map(s => (
          <button
            key={s.id}
            onClick={() => setScripture(s.id)}
            className={`p-3 rounded-xl border transition text-center ${
              scripture === s.id ? 'bg-fuchsia-500/20 border-fuchsia-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-[11px] font-bold">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Add button */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase font-bold tracking-widest text-fuchsia-400">
          {annotations.length} annotation{annotations.length > 1 ? 's' : ''} sur {currentScripture.label}
        </h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Plus size={12} /> Annoter un passage
        </button>
      </div>

      {showAdd && (
        <section className="bg-zinc-900 border-2 border-fuchsia-500/40 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Nouvelle annotation · {currentScripture.label}</h3>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-zinc-500 hover:text-white" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Référence (ex: Galates 3:28)" className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <select value={form.perspective} onChange={(e) => setForm({ ...form, perspective: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
              <option value="">Perspective (optionnel)</option>
              {PERSPECTIVES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <textarea value={form.passageText} onChange={(e) => setForm({ ...form, passageText: e.target.value })} rows={2} placeholder="Citation du passage (optionnel)" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm mb-3" />
          <textarea value={form.annotation} onChange={(e) => setForm({ ...form, annotation: e.target.value })} rows={5} placeholder="Ton commentaire inclusif (min 10 chars, modéré IA)…" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm mb-3" />
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} placeholder="Ton pseudo (optionnel)" className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <input value={form.authorRole} onChange={(e) => setForm({ ...form, authorRole: e.target.value })} placeholder="Rôle (théologien, fidèle…)" className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <select value={form.faith} onChange={(e) => setForm({ ...form, faith: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm mb-3 w-full">
            <option value="christian">Christianisme</option>
            <option value="muslim">Islam</option>
            <option value="jewish">Judaïsme</option>
            <option value="buddhist">Bouddhisme</option>
            <option value="hindu">Hindouisme</option>
            <option value="sikh">Sikhisme</option>
            <option value="interfaith">Inter-religieux</option>
          </select>
          <div className="flex items-center justify-end gap-2">
            {msg && <span className="text-xs text-fuchsia-300 mr-auto">{msg}</span>}
            <button onClick={() => setShowAdd(false)} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Annuler</button>
            <button onClick={submit} disabled={submitting || form.annotation.length < 10} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1">
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Publier
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-zinc-500" /></div>
      ) : annotations.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          Aucune annotation sur {currentScripture.label} pour l'instant.<br/>
          <span className="text-xs">Sois le·la premier·ère à partager un passage important !</span>
        </div>
      ) : (
        <div className="space-y-3">
          {annotations.map(a => (
            <article key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <header className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div>
                  <div className="font-bold text-base text-fuchsia-300">{a.reference}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {a.authorName ? `par ${a.authorName}` : 'Anonyme'}
                    {a.authorRole && ` · ${a.authorRole}`}
                    {a.perspective && ` · ${PERSPECTIVES.find(p => p.id === a.perspective)?.label || a.perspective}`}
                  </div>
                </div>
                <button onClick={() => upvote(a.id)} disabled={a._voted} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${a._voted ? 'bg-fuchsia-500/30 text-fuchsia-200' : 'bg-zinc-800 hover:bg-fuchsia-500/30 text-zinc-300'}`}>
                  <ThumbsUp size={11} /> {a.upvotes || 0}
                </button>
              </header>
              {a.passageText && (
                <blockquote className="italic text-sm text-zinc-300 border-l-4 border-fuchsia-500/40 pl-3 my-3 bg-fuchsia-500/5 py-2 rounded-r">
                  « {a.passageText} »
                </blockquote>
              )}
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{a.annotation}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
