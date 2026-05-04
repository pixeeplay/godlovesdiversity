'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles, Loader2, Calendar, MessageSquare, Tag, TrendingUp, Languages,
  Megaphone, Copy, Check, Building2, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

type Venue = { id: string; name: string; type: string; city: string | null; description: string | null; tags: string[] };
type Tool = 'describe-venue' | 'event-ideas' | 'reply-review' | 'generate-tags' | 'sentiment' | 'translate' | 'event-promo-post';

const TOOLS: Array<{ id: Tool; label: string; icon: any; color: string; desc: string }> = [
  { id: 'describe-venue',   label: 'Décrire mon lieu',     icon: Sparkles,      color: 'fuchsia', desc: 'Description IA en 4 langues' },
  { id: 'event-ideas',      label: 'Idées d\'événements',  icon: Calendar,      color: 'pink',    desc: 'Suggestions sur-mesure' },
  { id: 'reply-review',     label: 'Répondre à un avis',   icon: MessageSquare, color: 'cyan',    desc: 'Réponse personnalisée bienveillante' },
  { id: 'generate-tags',    label: 'Générer tags SEO',     icon: Tag,           color: 'emerald', desc: 'Tags optimisés SEO' },
  { id: 'event-promo-post', label: 'Posts promo events',   icon: Megaphone,     color: 'amber',   desc: 'Insta/FB/Twitter/Telegram' },
  { id: 'translate',        label: 'Traduire en 4 langues', icon: Languages,    color: 'violet',  desc: 'FR → EN/ES/PT' },
  { id: 'sentiment',        label: 'Analyse sentiment',    icon: TrendingUp,    color: 'rose',    desc: 'Tendances + recommandations' }
];

export function ProAIStudio({ venues }: { venues: Venue[] }) {
  const searchParams = useSearchParams();
  const initialTool = (searchParams.get('tool') as Tool) || 'describe-venue';
  const [tool, setTool] = useState<Tool>(initialTool);
  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const venue = venues.find(v => v.id === venueId);

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-5">
      <Link href="/admin/pro" className="text-fuchsia-400 hover:underline text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Espace Pro
      </Link>

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-fuchsia-500 via-violet-500 to-purple-600 rounded-xl p-3 shadow-lg shadow-fuchsia-500/30">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold leading-none">Studio IA Pro</h1>
            <p className="text-zinc-400 text-xs mt-1">7 outils intelligents pour booster ton lieu · powered by Gemini 2.0</p>
          </div>
        </div>
        {venues.length > 0 && (
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </header>

      {venues.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center text-amber-200">
          <Building2 size={32} className="mx-auto mb-2 opacity-50" />
          <p>Tu dois avoir au moins 1 lieu référencé pour utiliser les outils IA Pro.</p>
          <Link href="/contact" className="inline-block mt-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full">Demander mon accès pro</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-5">
          {/* Sidebar tools */}
          <aside className="space-y-1.5">
            {TOOLS.map(t => {
              const Icon = t.icon;
              const active = tool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-2.5 ${active ? `bg-${t.color}-500/15 border-${t.color}-500/40` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <Icon size={16} className={`text-${t.color}-400 mt-0.5 shrink-0`} />
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{t.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Tool panel — glow IA pendant génération via classe ai-glow appliquée par chaque tool */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative">
            {tool === 'describe-venue'   && <DescribeVenueTool venue={venue} />}
            {tool === 'event-ideas'      && <EventIdeasTool venue={venue} />}
            {tool === 'reply-review'     && <ReplyReviewTool venue={venue} />}
            {tool === 'generate-tags'    && <GenerateTagsTool venue={venue} />}
            {tool === 'event-promo-post' && <EventPromoPostTool venue={venue} />}
            {tool === 'translate'        && <TranslateTool />}
            {tool === 'sentiment'        && <SentimentTool venue={venue} />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============= TOOLS ============= */

function ToolFrame({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl transition ${busy ? 'ai-glow' : ''}`}>
      <div className={`space-y-4 ${busy ? 'animate-pulse' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function AIGenerateButton({ busy, onClick, disabled, label = 'Générer', icon }: { busy: boolean; onClick: () => void; disabled?: boolean; label?: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 transition relative ${busy ? 'ai-glow ai-glow-subtle' : ''}`}
    >
      {busy ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span className="ai-shimmer font-bold">L'IA réfléchit…</span>
        </>
      ) : (
        <>{icon || <Sparkles size={14} />}{label}</>
      )}
    </button>
  );
}

function DescribeVenueTool({ venue }: { venue?: Venue }) {
  const [tone, setTone] = useState('chaleureux');
  const [hint, setHint] = useState('');
  const [locales, setLocales] = useState<string[]>(['fr', 'en', 'es', 'pt']);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);

  async function run() {
    if (!venue) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/admin/pro/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'describe-venue', venueId: venue.id, payload: { tone, hint }, locales })
      });
      const j = await r.json();
      if (j.ok) setResult(j.descriptions);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Description IA de mon lieu</h2>
      <p className="text-sm text-zinc-400">Génère une description publique pour {venue?.name}, optimisée et traduite.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Ton">
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            <option value="chaleureux">Chaleureux & accueillant</option>
            <option value="moderne">Moderne & branché</option>
            <option value="poétique">Poétique & inspirant</option>
            <option value="militant">Engagé & militant</option>
            <option value="festif">Festif & énergique</option>
          </select>
        </Field>
        <Field label="Langues à générer">
          <div className="flex gap-2 flex-wrap pt-2">
            {(['fr', 'en', 'es', 'pt'] as const).map(l => (
              <label key={l} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={locales.includes(l)} onChange={(e) => setLocales(e.target.checked ? [...locales, l] : locales.filter(x => x !== l))} />
                {l.toUpperCase()}
              </label>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Indications optionnelles (style, ambiance, public visé...)">
        <textarea value={hint} onChange={(e) => setHint(e.target.value)} rows={2} placeholder="Ex: Mettre l'accent sur les soirées drag du jeudi, public 25-45 ans..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </Field>

      <AIGenerateButton busy={busy} disabled={!venue} onClick={run} label="Générer la description" />

      {(busy || result) && (
        <div className={`space-y-3 pt-3 rounded-xl p-3 ${busy ? 'ai-glow' : ''}`}>
          {busy && !result && (
            <div className="text-center py-8">
              <span className="ai-shimmer text-lg font-bold">Gemini rédige tes descriptions multilingues…</span>
            </div>
          )}
          {result && Object.entries(result).map(([lang, text]) => (
            <ResultBlock key={lang} label={lang.toUpperCase()} text={text} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventIdeasTool({ venue }: { venue?: Venue }) {
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [ideas, setIdeas] = useState<any[] | null>(null);

  async function run() {
    if (!venue) return;
    setBusy(true);
    setIdeas(null);
    try {
      const r = await fetch('/api/admin/pro/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'event-ideas', venueId: venue.id, payload: { count } })
      });
      const j = await r.json();
      if (j.ok) setIdeas(j.ideas);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Idées d'événements</h2>
      <p className="text-sm text-zinc-400">L'IA propose des événements LGBT-friendly originaux adaptés à {venue?.name} ({venue?.type}).</p>

      <div className="flex gap-2 items-end">
        <Field label="Combien d'idées ?">
          <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        </Field>
        <AIGenerateButton busy={busy} disabled={!venue} onClick={run} label="Générer" />
      </div>

      {busy && !ideas && <div className="text-center py-6"><span className="ai-shimmer text-base font-bold">Gemini imagine des idées d'événements pour ton lieu…</span></div>}

      {ideas && (
        <div className={`grid sm:grid-cols-2 gap-3 pt-2 rounded-xl p-2 ${busy ? 'ai-glow' : ''}`}>
          {ideas.map((idea, i) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="font-bold text-sm">{idea.title}</div>
              <div className="text-xs text-zinc-400 mt-1">{idea.description}</div>
              <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
                {idea.duration && <span>⏱ {idea.duration}</span>}
                {idea.audience && <span>👥 {idea.audience}</span>}
                {idea.month && <span>📅 {idea.month}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyReviewTool({ venue }: { venue?: Venue }) {
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [tone, setTone] = useState('chaleureux et professionnel');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');

  async function run() {
    if (!venue || !reviewText) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/pro/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'reply-review', venueId: venue.id, payload: { reviewText, rating, tone } })
      });
      const j = await r.json();
      if (j.ok) setReply(j.reply);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Réponse IA à un avis</h2>
      <p className="text-sm text-zinc-400">Colle l'avis client, l'IA rédige une réponse adaptée au ton.</p>

      <Field label="Avis du client">
        <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} placeholder="Colle ici l'avis..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Note (sur 5)">
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} ({n}/5)</option>)}
          </select>
        </Field>
        <Field label="Ton de la réponse">
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            <option value="chaleureux et professionnel">Chaleureux & pro</option>
            <option value="amical et décontracté">Amical & cool</option>
            <option value="formel et respectueux">Formel</option>
          </select>
        </Field>
      </div>

      <AIGenerateButton busy={busy} disabled={!reviewText} onClick={run} label="Générer la réponse" />

      {busy && !reply && <div className="text-center py-6"><span className="ai-shimmer text-base font-bold">Gemini compose ta réponse personnalisée…</span></div>}
      {reply && <div className={`rounded-xl ${busy ? 'ai-glow' : ''}`}><ResultBlock label="Réponse suggérée" text={reply} /></div>}
    </div>
  );
}

function GenerateTagsTool({ venue }: { venue?: Venue }) {
  const [busy, setBusy] = useState(false);
  const [tags, setTags] = useState<string[] | null>(null);

  async function run() {
    if (!venue) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/pro/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'generate-tags', venueId: venue.id, payload: {} })
      });
      const j = await r.json();
      if (j.ok) setTags(j.tags);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Tags SEO IA</h2>
      <p className="text-sm text-zinc-400">L'IA propose 8-12 tags optimisés pour le référencement de {venue?.name}.</p>

      <AIGenerateButton busy={busy} disabled={!venue} onClick={run} label="Générer les tags" />

      {busy && !tags && <div className="text-center py-6"><span className="ai-shimmer text-base font-bold">Gemini compose tes tags SEO…</span></div>}
      {tags && (
        <div className={`flex flex-wrap gap-2 pt-3 rounded-xl p-2 ${busy ? 'ai-glow' : ''}`}>
          {tags.map(tag => (
            <span key={tag} className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full text-xs font-mono">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EventPromoPostTool({ venue }: { venue?: Venue }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<any | null>(null);

  async function run() {
    if (!title) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/pro/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'event-promo-post', venueId: venue?.id, payload: { title, startsAt: date, description, venueName: venue?.name } })
      });
      const j = await r.json();
      if (j.ok) setPosts(j.posts);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Posts promo événement</h2>
      <p className="text-sm text-zinc-400">L'IA rédige un post pour Instagram, Facebook, Twitter et Telegram.</p>

      <Field label="Titre de l'événement"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Soirée drag karaoké" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>
      <Field label="Date (texte libre)"><input value={date} onChange={(e) => setDate(e.target.value)} placeholder="vendredi 15 mai 22h" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>

      <AIGenerateButton busy={busy} disabled={!title} onClick={run} label="Générer les posts" />

      {busy && !posts && <div className="text-center py-6"><span className="ai-shimmer text-base font-bold">Gemini rédige tes posts pour 4 plateformes…</span></div>}
      {posts && (
        <div className={`space-y-3 pt-2 rounded-xl p-2 ${busy ? 'ai-glow' : ''}`}>
          {posts.instagram && <ResultBlock label="📸 Instagram" text={posts.instagram} />}
          {posts.facebook  && <ResultBlock label="📘 Facebook"  text={posts.facebook} />}
          {posts.twitter   && <ResultBlock label="🐦 Twitter/X" text={posts.twitter} />}
          {posts.telegram  && <ResultBlock label="✈️ Telegram"  text={posts.telegram} />}
        </div>
      )}
    </div>
  );
}

function TranslateTool() {
  const [text, setText] = useState('');
  const [from, setFrom] = useState('fr');
  const [locales, setLocales] = useState<string[]>(['en', 'es', 'pt']);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);

  async function run() {
    if (!text) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/pro/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'translate', payload: { text, from }, locales })
      });
      const j = await r.json();
      if (j.ok) setResult(j.translations);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Traduction IA multilingue</h2>
      <p className="text-sm text-zinc-400">Traduis n'importe quel texte (description, post, message) en plusieurs langues.</p>

      <Field label="Texte source"><textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Depuis">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            {(['fr', 'en', 'es', 'pt'] as const).map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </Field>
        <Field label="Vers">
          <div className="flex gap-2 flex-wrap pt-2">
            {(['fr', 'en', 'es', 'pt'] as const).filter(l => l !== from).map(l => (
              <label key={l} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={locales.includes(l)} onChange={(e) => setLocales(e.target.checked ? [...locales, l] : locales.filter(x => x !== l))} />
                {l.toUpperCase()}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <AIGenerateButton busy={busy} disabled={!text} onClick={run} label="Traduire" icon={<Languages size={14} />} />

      {busy && !result && <div className="text-center py-6"><span className="ai-shimmer text-base font-bold">Gemini traduit ton texte…</span></div>}
      {result && (
        <div className={`space-y-3 pt-2 rounded-xl p-2 ${busy ? 'ai-glow' : ''}`}>
          {Object.entries(result).map(([lang, t]) => <ResultBlock key={lang} label={lang.toUpperCase()} text={t} />)}
        </div>
      )}
    </div>
  );
}

function SentimentTool({ venue }: { venue?: Venue }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  async function run() {
    if (!venue) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/pro/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'sentiment', venueId: venue.id })
      });
      const j = await r.json();
      setResult(j);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Analyse de sentiment</h2>
      <p className="text-sm text-zinc-400">Analyse les avis et commentaires liés à {venue?.name}, propose des recommandations.</p>

      <AIGenerateButton busy={busy} disabled={!venue} onClick={run} label="Lancer l'analyse" icon={<TrendingUp size={14} />} />

      {busy && !result && <div className="text-center py-6"><span className="ai-shimmer text-base font-bold">Gemini analyse les sentiments…</span></div>}
      {result && (
        <div className={`bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 ${busy ? 'ai-glow' : ''}`}>
          {result.insights || 'Pas de données à analyser.'}
        </div>
      )}
    </div>
  );
}

/* ============= UTILS ============= */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ResultBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-zinc-950 border border-fuchsia-500/20 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold text-fuchsia-400">{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="text-zinc-400 hover:text-white text-xs flex items-center gap-1">
          {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
        </button>
      </div>
      <div className="text-sm text-zinc-200 whitespace-pre-wrap">{text}</div>
    </div>
  );
}
