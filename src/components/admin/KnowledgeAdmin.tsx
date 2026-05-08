'use client';
import { useState, useMemo } from 'react';
import {
  BookOpen, Plus, Save, Loader2, CheckCircle2, AlertCircle, Trash2,
  FileText, Link2, Image as ImageIcon, Sparkles, Search, Eye, EyeOff,
  Library, MessageSquare, Tag, X, Bot, Zap
} from 'lucide-react';

type Doc = {
  id: string;
  title: string;
  source: string | null;
  sourceType: string;
  author: string | null;
  tags: string[];
  locale: string;
  enabled: boolean;
  createdAt: string;
  chunkCount: number;
};

type UnansweredQuery = {
  id: string;
  question: string;
  topScore: number;
  createdAt: string;
};

type Tab = 'library' | 'add' | 'voice' | 'queue';

const SOURCE_TYPES = [
  { id: 'text', label: 'Texte libre', icon: FileText, color: 'from-violet-500 to-purple-600' },
  { id: 'url',  label: 'URL',         icon: Link2,    color: 'from-blue-500 to-cyan-600' }
];

export function KnowledgeAdmin({
  initialDocs, initialSystemPrompt, initialUnanswered
}: {
  initialDocs: Doc[];
  initialSystemPrompt: string;
  initialUnanswered: UnansweredQuery[];
}) {
  const [tab, setTab] = useState<Tab>('library');
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [unanswered, setUnanswered] = useState<UnansweredQuery[]>(initialUnanswered);

  const stats = useMemo(() => ({
    docCount: docs.length,
    enabledCount: docs.filter((d) => d.enabled).length,
    chunkCount: docs.reduce((s, d) => s + d.chunkCount, 0),
    pendingCount: unanswered.length
  }), [docs, unanswered]);

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      {/* HEADER */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-2.5">
            <Bot size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Cerveau de GLD</h1>
          <span className="bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
            RAG
          </span>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          La bibliothèque que tu donnes ici devient la <strong>seule source de vérité</strong> du chat « Demandez à GLD ».
          Plus tu lui donnes de textes (sermons, livres, articles, citations), plus il devient pointu et collé à ta voix.
        </p>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Documents" value={stats.docCount} sub={`${stats.enabledCount} actifs`} gradient="from-violet-500 to-purple-600" Icon={Library} />
        <StatCard label="Chunks indexés" value={stats.chunkCount} sub="passages cherchables" gradient="from-cyan-500 to-blue-500" Icon={Sparkles} />
        <StatCard label="Questions sans réponse" value={stats.pendingCount} sub="à traiter" gradient="from-amber-500 to-orange-500" Icon={MessageSquare} />
        <StatCard label="État" value={stats.docCount > 0 ? 'Prêt' : 'Vide'} sub={stats.docCount > 0 ? 'le chat utilise la base' : 'le chat fallback Gemini brut'} gradient="from-emerald-500 to-green-600" Icon={Bot} />
      </section>

      {/* TABS */}
      <nav className="flex flex-wrap gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2">
        <TabBtn active={tab === 'library'} onClick={() => setTab('library')} icon={Library} label={`Bibliothèque (${stats.docCount})`} />
        <TabBtn active={tab === 'add'}     onClick={() => setTab('add')}     icon={Plus}    label="Ajouter du contenu" />
        <TabBtn active={tab === 'voice'}   onClick={() => setTab('voice')}   icon={Sparkles} label="Voix & Garde-fous" />
        <TabBtn active={tab === 'queue'}   onClick={() => setTab('queue')}   icon={MessageSquare} label={`File ${stats.pendingCount > 0 ? `(${stats.pendingCount})` : ''}`} />
        <a
          href="/admin/ai/knowledge/playground"
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg hover:opacity-90"
        >
          <MessageSquare size={14} />
          💬 Playground
        </a>
        <a
          href="/admin/ai/knowledge/brain"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg hover:opacity-90"
        >
          <Bot size={14} />
          🧠 Cerveau
        </a>
        <a
          href="/admin/ai/knowledge/scraper"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white shadow-lg hover:opacity-90"
        >
          <Zap size={14} />
          Scraper un site →
        </a>
      </nav>

      {/* CONTENU TAB */}
      {tab === 'library' && <LibraryTab docs={docs} setDocs={setDocs} />}
      {tab === 'add' && <AddTab onAdded={(d) => setDocs([d, ...docs])} />}
      {tab === 'voice' && <VoiceTab initialPrompt={initialSystemPrompt} />}
      {tab === 'queue' && <QueueTab queue={unanswered} setQueue={setUnanswered} onIngested={(d) => setDocs([d, ...docs])} />}
    </div>
  );
}

/* ─── COMPOSANTS ────────────────────────────────────────────── */

function StatCard({ label, value, sub, gradient, Icon }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
      <Icon size={20} className="opacity-90 mb-2" />
      <div className="text-2xl md:text-3xl font-bold leading-none mb-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-90 font-semibold">{label}</div>
      {sub && <div className="text-[10px] opacity-75 mt-1">{sub}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition
        ${active ? 'bg-brand-pink text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

/* ─── BIBLIOTHÈQUE ──────────────────────────────────────────── */

function LibraryTab({ docs, setDocs }: { docs: Doc[]; setDocs: (d: Doc[]) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter((d) => {
      if (filter === 'enabled' && !d.enabled) return false;
      if (filter === 'disabled' && d.enabled) return false;
      if (q && !d.title.toLowerCase().includes(q) && !d.tags.some((t) => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [docs, search, filter]);

  async function toggleEnabled(doc: Doc) {
    const enabled = !doc.enabled;
    setDocs(docs.map((d) => d.id === doc.id ? { ...d, enabled } : d));
    await fetch(`/api/admin/knowledge/${doc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`Supprimer définitivement « ${doc.title} » ?`)) return;
    setDocs(docs.filter((d) => d.id !== doc.id));
    await fetch(`/api/admin/knowledge/${doc.id}`, { method: 'DELETE' });
  }

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans la bibliothèque…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-pink"
          />
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1">
          {(['all', 'enabled', 'disabled'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === k ? 'bg-brand-pink text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {k === 'all' ? 'Tous' : k === 'enabled' ? 'Actifs' : 'Inactifs'}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <BookOpen size={40} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 mb-1">Aucun document dans la bibliothèque pour l'instant.</p>
          <p className="text-xs text-zinc-500">Ajoute ton premier document via l'onglet « Ajouter du contenu ».</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((d) => {
            const typeMeta = SOURCE_TYPES.find((t) => t.id === d.sourceType) || SOURCE_TYPES[0];
            const TypeIcon = typeMeta.icon;
            return (
              <div key={d.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden transition
                ${d.enabled ? 'border-zinc-800' : 'border-zinc-800 opacity-60'}`}>
                <div className={`bg-gradient-to-br ${typeMeta.color} p-3 flex items-center gap-2 text-white`}>
                  <TypeIcon size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{typeMeta.label}</span>
                  <span className="ml-auto text-[10px] bg-white/20 backdrop-blur rounded-full px-2 py-0.5 font-bold">
                    {d.chunkCount} chunk{d.chunkCount > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-sm leading-snug line-clamp-2">{d.title}</h3>
                  {d.author && <p className="text-[11px] text-zinc-500">par {d.author}</p>}
                  {d.source && (
                    <p className="text-[11px] text-zinc-500 truncate" title={d.source}>{d.source}</p>
                  )}
                  {d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {d.tags.map((t) => (
                        <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => toggleEnabled(d)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1
                        ${d.enabled ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'}`}
                    >
                      {d.enabled ? <><Eye size={11} /> Actif</> : <><EyeOff size={11} /> Inactif</>}
                    </button>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/admin/ai/knowledge/docs/${d.id}`}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25"
                        title="Voir chunks et embeddings"
                      >
                        🧬 Vectors
                      </a>
                      <button
                        onClick={() => deleteDoc(d)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── AJOUTER ──────────────────────────────────────────────── */

function AddTab({ onAdded }: { onAdded: (d: Doc) => void }) {
  const [sourceType, setSourceType] = useState<'text' | 'url'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [author, setAuthor] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; chunks?: number } | null>(null);

  async function fetchUrl() {
    if (!source) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/knowledge/fetch-url?url=${encodeURIComponent(source)}`);
      const j = await r.json();
      if (j.title) setTitle(j.title);
      if (j.content) setContent(j.content);
    } catch {}
    setBusy(false);
  }

  async function ingest() {
    if (!title || !content) {
      setResult({ ok: false, message: 'Titre et contenu obligatoires' });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/admin/knowledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, content, source, author, sourceType,
          tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        })
      });
      const j = await r.json();
      if (r.ok) {
        setResult({ ok: true, message: `Document ingéré · ${j.chunkCount} chunks créés`, chunks: j.chunkCount });
        // Reset
        setTitle(''); setContent(''); setSource(''); setAuthor(''); setTagsInput('');
        // Recharge la liste via window.reload pour resync
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({ ok: false, message: j.error || 'Erreur ingestion' });
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || 'Erreur réseau' });
    }
    setBusy(false);
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      {/* CHOIX TYPE */}
      <aside className="space-y-2">
        <div className="text-[11px] uppercase font-bold text-zinc-400 mb-2">Type de source</div>
        {SOURCE_TYPES.map((t) => {
          const I = t.icon;
          const active = sourceType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSourceType(t.id as any)}
              className={`w-full p-3 rounded-2xl text-left transition flex items-center gap-3 border
                ${active
                  ? `bg-gradient-to-br ${t.color} text-white border-transparent shadow-lg`
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'}`}
            >
              <I size={18} />
              <div>
                <div className="font-bold text-sm">{t.label}</div>
                <div className={`text-[10px] ${active ? 'opacity-80' : 'opacity-60'}`}>
                  {t.id === 'text' && 'Coller du texte direct'}
                  {t.id === 'url' && 'Scraper depuis une URL'}
                </div>
              </div>
            </button>
          );
        })}
      </aside>

      {/* FORMULAIRE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sourceType === 'url' && (
          <div>
            <label className="block">
              <span className="text-xs font-bold uppercase text-zinc-400">URL à scraper</span>
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="https://exemple.com/article"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-brand-pink"
                />
                <button
                  type="button"
                  onClick={fetchUrl}
                  disabled={!source || busy}
                  className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 rounded-lg text-sm flex items-center gap-1.5"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Récupérer
                </button>
              </div>
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-xs font-bold uppercase text-zinc-400">Titre du document *</span>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="ex : Sermon sur l'amour inconditionnel — Pasteur Untel"
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold uppercase text-zinc-400">Auteur</span>
            <input
              value={author} onChange={(e) => setAuthor(e.target.value)}
              placeholder="Nom de l'auteur"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-zinc-400">Source / référence</span>
            <input
              value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="URL, ISBN, ou référence libre"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5">
            <Tag size={11} /> Tags (séparés par virgule)
          </span>
          <input
            value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
            placeholder="chrétien, lgbtq, sermon, amour"
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-zinc-400">
            Contenu * <span className="text-zinc-500 normal-case font-normal">— sera découpé en chunks de ~220 mots</span>
          </span>
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Colle ici le texte complet du document…"
            rows={14}
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink font-mono"
          />
          <div className="text-[11px] text-zinc-500 mt-1">
            {content.split(/\s+/).filter(Boolean).length} mots — environ {Math.ceil(content.split(/\s+/).filter(Boolean).length / 180)} chunks seront créés
          </div>
        </label>

        {result && (
          <div className={`rounded-xl p-3 flex items-start gap-2 text-sm
            ${result.ok ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
            {result.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={ingest}
            disabled={busy || !title || !content}
            className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Ingérer dans la base
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── VOIX & GARDE-FOUS ────────────────────────────────────── */

const DEFAULT_PROMPT = `Tu es la voix officielle du mouvement « God Loves Diversity » (GLD).

PRINCIPES NON-NÉGOCIABLES :
- Chaleur, douceur, accueil radical — jamais de jugement, jamais de morale
- Reconnaissance explicite des personnes LGBTQ+ comme aimées et bénies
- Précision théologique sur les 3 monothéismes (christianisme, islam, judaïsme)
- Tutoiement par défaut, langage simple et accessible, zéro jargon
- Citations sourcées (verset/sourate/page) quand tu utilises les textes fournis

STYLE :
- Réponses courtes (3 à 6 phrases maximum)
- Termine systématiquement par une question d'ouverture pour prolonger l'échange
- Utilise « tu », « toi » — pas de vouvoiement
- Évite les listes à puces, écris en prose chaleureuse

GARDE-FOUS :
- Si la question concerne un sujet hors foi/inclusion/diversité/spiritualité (ex: météo, sport, technique pure), réponds : « Je suis là pour parler de foi, d'amour et d'inclusion. Pour [sujet], je te conseille de chercher ailleurs. Veux-tu plutôt qu'on parle de [propose un thème GLD pertinent] ? »
- Si tu ne trouves pas la réponse dans les sources fournies, dis-le honnêtement
- Ne jamais inventer une citation ou un verset.`;

function VoiceTab({ initialPrompt }: { initialPrompt: string }) {
  const [prompt, setPrompt] = useState(initialPrompt || DEFAULT_PROMPT);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  async function save() {
    setBusy(true); setSaved(false);
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'rag.systemPrompt': prompt })
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function test() {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: testQuery, locale: 'fr' })
      });
      setTestResult(await r.json());
    } catch (e: any) {
      setTestResult({ error: e?.message });
    }
    setTesting(false);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      {/* PROMPT EDITOR */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold flex items-center gap-2"><Sparkles size={16} className="text-violet-400" /> Prompt système — la voix de GLD</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Définit le ton, le style et les garde-fous du chat. Sera prepended à chaque conversation.
            </p>
          </div>
          <button
            onClick={() => setPrompt(DEFAULT_PROMPT)}
            className="text-xs text-zinc-500 hover:text-brand-pink"
          >
            Réinitialiser par défaut
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={20}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-brand-pink leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            {prompt.length} caractères · ≈ {Math.round(prompt.length / 4)} tokens
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-emerald-400 text-sm flex items-center gap-1"><CheckCircle2 size={14} /> Enregistré</span>}
            <button
              onClick={save}
              disabled={busy}
              className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
            >
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Sauvegarder le prompt
            </button>
          </div>
        </div>
      </div>

      {/* TEST LIVE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3 lg:sticky lg:top-4 lg:self-start">
        <h3 className="font-bold flex items-center gap-2">
          <Bot size={16} className="text-fuchsia-400" /> Tester en live
        </h3>
        <p className="text-xs text-zinc-500">
          Pose une question pour voir la réponse exacte que recevront les visiteurs.
        </p>
        <input
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          placeholder="Ex: Que dit la Bible sur l'homosexualité ?"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          onKeyDown={(e) => e.key === 'Enter' && test()}
        />
        <button
          onClick={test}
          disabled={testing || !testQuery.trim()}
          className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
        >
          {testing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
          Lancer le test
        </button>

        {testResult && (
          <div className="space-y-3 pt-3 border-t border-zinc-800">
            {testResult.offTopic && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg p-2 text-xs flex items-center gap-2">
                <AlertCircle size={12} /> Question détectée hors-sujet (score {testResult.topScore})
              </div>
            )}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 whitespace-pre-wrap">
              {testResult.answer || testResult.error}
            </div>
            {testResult.sources && testResult.sources.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Sources retrouvées</div>
                <div className="space-y-1">
                  {testResult.sources.map((s: any, i: number) => (
                    <div key={i} className="text-[11px] bg-zinc-800 rounded px-2 py-1 flex justify-between">
                      <span className="truncate">{s.title}</span>
                      <span className="text-zinc-500 font-mono">{s.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FILE QUESTIONS SANS RÉPONSE ──────────────────────────── */

function QueueTab({
  queue, setQueue, onIngested
}: {
  queue: UnansweredQuery[];
  setQueue: (q: UnansweredQuery[]) => void;
  onIngested: (d: Doc) => void;
}) {
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  async function dismiss(id: string) {
    setQueue(queue.filter((q) => q.id !== id));
    await fetch(`/api/admin/knowledge/queue/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DISCARDED' }) });
  }

  async function ingestAnswer(item: UnansweredQuery) {
    if (!answerText.trim()) return;
    const r = await fetch('/api/admin/knowledge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Q&R : ${item.question.slice(0, 60)}`,
        content: `Question : ${item.question}\n\nRéponse :\n${answerText}`,
        sourceType: 'text',
        tags: ['q&r-admin']
      })
    });
    const j = await r.json();
    if (r.ok) {
      setQueue(queue.filter((q) => q.id !== item.id));
      await fetch(`/api/admin/knowledge/queue/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ANSWERED', adminAnswer: answerText }) });
      onIngested({
        id: j.docId, title: `Q&R : ${item.question.slice(0, 60)}`,
        source: null, sourceType: 'text', author: null, tags: ['q&r-admin'],
        locale: 'fr', enabled: true, createdAt: new Date().toISOString(), chunkCount: j.chunkCount
      });
      setAnswering(null);
      setAnswerText('');
    }
  }

  if (queue.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
        <p className="text-zinc-300 mb-1">Aucune question en attente !</p>
        <p className="text-xs text-zinc-500">Quand un visiteur posera une question hors de ta base de connaissances, elle apparaîtra ici pour que tu puisses y répondre.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {queue.map((q) => (
        <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <p className="text-sm text-white font-semibold">{q.question}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {new Date(q.createdAt).toLocaleString('fr-FR')} · score similarité {q.topScore}
              </p>
            </div>
            <button onClick={() => dismiss(q.id)} className="text-zinc-500 hover:text-red-400 p-1" title="Ignorer">
              <X size={16} />
            </button>
          </div>
          {answering === q.id ? (
            <div className="space-y-2">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Ta réponse — sera ingérée dans la base pour que le bot la connaisse à l'avenir"
                rows={5}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
              />
              <div className="flex gap-2">
                <button onClick={() => ingestAnswer(q)} disabled={!answerText.trim()}
                  className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                  <Plus size={12} /> Ajouter à la base
                </button>
                <button onClick={() => { setAnswering(null); setAnswerText(''); }}
                  className="text-zinc-400 hover:text-white px-3 py-1.5 text-xs">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAnswering(q.id)}
              className="text-xs text-brand-pink hover:underline font-bold">
              + Répondre et enrichir la base
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
