'use client';
import { useState } from 'react';
import {
  Sparkles, Loader2, Image as ImageIcon, Type, Languages,
  BarChart3, Calendar, Heart, Wand2, ScanFace, Copy
} from 'lucide-react';
import { HeroVisualsAdmin } from './HeroVisualsAdmin';
import { MusicGenerator } from './MusicGenerator';

const TABS = [
  { v: 'visuals', l: '🎨 Visuels Hero', icon: Wand2 },
  { v: 'music', l: '🎵 Musique IA', icon: Heart },
  { v: 'caption', l: 'Légende photo', icon: ImageIcon },
  { v: 'testimony', l: 'Témoignage', icon: Heart },
  { v: 'variants', l: 'Variantes social', icon: Wand2 },
  { v: 'translate', l: 'Traduction', icon: Languages },
  { v: 'newsletter', l: 'Newsletter mensuelle', icon: Type },
  { v: 'sentiment', l: 'Sentiment', icon: BarChart3 },
  { v: 'cluster', l: 'Clustering', icon: BarChart3 },
  { v: 'weekly', l: 'Synthèse hebdo', icon: BarChart3 },
  { v: 'calendar', l: 'Calendrier IA', icon: Calendar },
  { v: 'verse', l: 'Verset du jour', icon: Sparkles },
  { v: 'photo-tools', l: 'Outils photo', icon: ScanFace }
];

export function AIStudio() {
  const [tab, setTab] = useState('caption');
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const I = t.icon;
          return (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`px-3 py-2 rounded-full text-xs border flex items-center gap-1 transition
                ${tab === t.v ? 'border-brand-pink text-brand-pink bg-brand-pink/10' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
              <I size={12} /> {t.l}
            </button>
          );
        })}
      </div>

      {tab === 'visuals' && <HeroVisualsAdmin />}
      {tab === 'music' && <MusicGenerator />}
      {tab === 'caption' && <CaptionTab />}
      {tab === 'testimony' && <TestimonyTab />}
      {tab === 'variants' && <VariantsTab />}
      {tab === 'translate' && <TranslateTab />}
      {tab === 'newsletter' && <NewsletterTab />}
      {tab === 'sentiment' && <SentimentTab />}
      {tab === 'cluster' && <ClusterTab />}
      {tab === 'weekly' && <WeeklyTab />}
      {tab === 'calendar' && <CalendarTab />}
      {tab === 'verse' && <VerseTab />}
      {tab === 'photo-tools' && <PhotoToolsTab />}
    </div>
  );
}

function CallButton({ busy, children, ...props }: any) {
  return (
    <button disabled={busy} {...props} className="btn-primary text-sm">
      {busy ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} {children}
    </button>
  );
}

function ResultBox({ text, json }: { text: string; json?: any }) {
  if (!text && !json) return null;
  return (
    <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">Résultat</span>
        {text && (
          <button onClick={() => navigator.clipboard.writeText(text)}
            className="text-xs text-brand-pink hover:underline flex items-center gap-1">
            <Copy size={12} /> Copier
          </button>
        )}
      </div>
      {json ? (
        <pre className="text-xs text-white/80 whitespace-pre-wrap">{JSON.stringify(json, null, 2)}</pre>
      ) : (
        <p className="text-white/90 whitespace-pre-wrap leading-relaxed">{text}</p>
      )}
    </div>
  );
}

/* ─────────────── TABS ─────────────── */

function CaptionTab() {
  const [url, setUrl] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/caption', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: url }) });
    const j = await r.json();
    setOut(j.text || j.error);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Colle l'URL d'une photo de la galerie. Gemini Vision la décrit en 80 mots avec hashtags.</p>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…ou /api/storage/uploads/2026-04-24/…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        <CallButton busy={busy} onClick={go}>Générer</CallButton>
      </div>
      <ResultBox text={out} />
    </div>
  );
}

function TestimonyTab() {
  const [text, setText] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState(true);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/testimony', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, anonymize: anon }) });
    const j = await r.json();
    setOut(j.text);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Colle un témoignage brut, l'IA le retravaille pour publication.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-2" />
      <label className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Anonymiser
      </label>
      <CallButton busy={busy} onClick={go}>Réécrire</CallButton>
      <ResultBox text={out} />
    </div>
  );
}

function VariantsTab() {
  const [brief, setBrief] = useState('');
  const [network, setNetwork] = useState('Instagram');
  const [count, setCount] = useState(5);
  const [variants, setVariants] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief, network, count }) });
    const j = await r.json();
    setVariants(j.variants || []);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Décris brièvement le post → l'IA en propose {count} versions.</p>
      <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} placeholder="Ex: Annoncer notre 1000ᵉ photo collectée"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-2" />
      <div className="flex gap-2 mb-3">
        <select value={network} onChange={(e) => setNetwork(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
          {['Instagram', 'X / Twitter', 'LinkedIn', 'Facebook', 'TikTok'].map((n) => <option key={n}>{n}</option>)}
        </select>
        <input type="number" min={2} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))}
          className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        <CallButton busy={busy} onClick={go}>Générer</CallButton>
      </div>
      <div className="space-y-2">
        {variants.map((v: any, i) => (
          <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span>Version {v.version}</span>
              <button onClick={() => navigator.clipboard.writeText(v.content)} className="text-brand-pink hover:underline flex items-center gap-1">
                <Copy size={11} /> Copier
              </button>
            </div>
            <p className="text-sm text-white/90 whitespace-pre-wrap">{v.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TranslateTab() {
  const [text, setText] = useState('');
  const [target, setTarget] = useState<'en' | 'es' | 'pt'>('en');
  const [out, setOut] = useState('');
  const [mode, setMode] = useState<'translate' | 'detect' | 'adapt'>('translate');
  const [market, setMarket] = useState('latino-américain');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, text, target, market }) });
    const j = await r.json();
    setOut(j.text);
    setBusy(false);
  }
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {[
          { v: 'translate', l: 'Traduire' },
          { v: 'detect', l: 'Détecter langue' },
          { v: 'adapt', l: 'Adapter culture' }
        ].map((m) => (
          <button key={m.v} onClick={() => setMode(m.v as any)}
            className={`px-3 py-1 rounded-full text-xs border ${mode === m.v ? 'border-brand-pink text-brand-pink' : 'border-zinc-800 text-zinc-500'}`}>
            {m.l}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-2" />
      <div className="flex gap-2 items-center mb-3">
        {mode === 'translate' && (
          <select value={target} onChange={(e) => setTarget(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            <option value="en">→ Anglais</option>
            <option value="es">→ Espagnol</option>
            <option value="pt">→ Portugais</option>
          </select>
        )}
        {mode === 'adapt' && (
          <input value={market} onChange={(e) => setMarket(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="public cible…" />
        )}
        <CallButton busy={busy} onClick={go}>Lancer</CallButton>
      </div>
      <ResultBox text={out} />
    </div>
  );
}

function NewsletterTab() {
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/newsletter', { method: 'POST' });
    const j = await r.json();
    setOut(j.text);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Génère la newsletter du mois automatiquement à partir des stats des 30 derniers jours.</p>
      <CallButton busy={busy} onClick={go}>Générer la newsletter du mois</CallButton>
      {out && <div className="mt-4 bg-white/5 border border-zinc-800 rounded-2xl p-6 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: out }} />}
    </div>
  );
}

function SentimentTab() {
  const [text, setText] = useState('');
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'sentiment', text }) });
    const j = await r.json();
    setOut(j.parsed);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Analyse émotionnelle d'un témoignage.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-2" />
      <CallButton busy={busy} onClick={go}>Analyser</CallButton>
      {out && (
        <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-2">
          <div><span className="text-zinc-500 text-xs">Émotion principale :</span> <span className="text-brand-pink font-bold">{out.primary}</span></div>
          {out.secondary && <div><span className="text-zinc-500 text-xs">Secondaires :</span> {out.secondary?.join(', ')}</div>}
          <div><span className="text-zinc-500 text-xs">Intensité :</span> {out.intensity}/10</div>
          <p className="text-sm text-white/80 italic">{out.summary}</p>
        </div>
      )}
    </div>
  );
}

function ClusterTab() {
  const [items, setItems] = useState('');
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const lines = items.split('\n').filter(Boolean).map((l, i) => ({ id: `t${i}`, text: l }));
    const r = await fetch('/api/ai/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'cluster', items: lines }) });
    const j = await r.json();
    setOut(j.parsed);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Colle plusieurs témoignages (1 par ligne), l'IA les regroupe par thème.</p>
      <textarea value={items} onChange={(e) => setItems(e.target.value)} rows={8}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-2 font-mono" />
      <CallButton busy={busy} onClick={go}>Clusteriser</CallButton>
      {out?.clusters && (
        <div className="mt-4 space-y-2">
          {out.clusters.map((c: any, i: number) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="font-bold text-brand-pink">{c.theme}</div>
              <p className="text-sm text-white/70 mt-1">{c.summary}</p>
              <div className="text-xs text-zinc-500 mt-2">{c.ids?.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeeklyTab() {
  const [out, setOut] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'weekly' }) });
    const j = await r.json();
    setOut(j.text);
    setStats(j.stats);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Synthèse de l'activité des 7 derniers jours.</p>
      <CallButton busy={busy} onClick={go}>Générer la synthèse</CallButton>
      {stats && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="bg-zinc-900 rounded-lg p-3">
              <div className="text-2xl font-bold text-brand-pink">{String(v)}</div>
              <div className="text-zinc-500">{k}</div>
            </div>
          ))}
        </div>
      )}
      <ResultBox text={out} />
    </div>
  );
}

function CalendarTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [out, setOut] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch('/api/ai/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'calendar', monthDate: month }) });
    const j = await r.json();
    setOut(j.parsed?.events || []);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Liste les événements religieux et inclusifs du mois + propose un post pour chacun.</p>
      <div className="flex gap-2 mb-3">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        <CallButton busy={busy} onClick={go}>Générer</CallButton>
      </div>
      <div className="space-y-2">
        {out.map((e: any, i: number) => (
          <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">{e.name}</span>
              <span className="text-xs text-zinc-500">{e.date} · {e.category}</span>
            </div>
            <p className="text-sm text-white/80 italic">💡 {e.post_idea}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerseTab() {
  const [theme, setTheme] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch(`/api/ai/verse?theme=${encodeURIComponent(theme)}`);
    const j = await r.json();
    setOut(j.text);
    setBusy(false);
  }
  return (
    <div>
      <p className="text-zinc-400 text-sm mb-3">Génère un message inspirant quotidien, prêt à publier ou à envoyer en push.</p>
      <div className="flex gap-2 mb-3">
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Thème (optionnel)"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        <CallButton busy={busy} onClick={go}>Générer</CallButton>
      </div>
      {out && (
        <div className="bg-gradient-to-r from-brand-pink/10 to-purple-600/10 border border-brand-pink/30 rounded-2xl p-8 text-center">
          <p className="font-display text-xl text-white/90 italic">"{out}"</p>
        </div>
      )}
    </div>
  );
}

function PhotoToolsTab() {
  const [photoId, setPhotoId] = useState('');
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function blurFaces() {
    setBusy(true);
    const r = await fetch('/api/ai/photo/blur', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId }) });
    const j = await r.json();
    setOut(j);
    setBusy(false);
  }
  async function dedup() {
    setBusy(true);
    const r = await fetch('/api/ai/photo/dedup', { method: 'POST' });
    const j = await r.json();
    setOut(j);
    setBusy(false);
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-zinc-400 text-sm mb-3">📸 Floutage automatique des visages (utilise Gemini Vision pour détecter, sharp pour flouter).</p>
        <div className="flex gap-2">
          <input value={photoId} onChange={(e) => setPhotoId(e.target.value)} placeholder="ID de la photo (depuis /admin/moderation)"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" />
          <CallButton busy={busy} onClick={blurFaces}>Flouter visages</CallButton>
        </div>
      </div>
      <div>
        <p className="text-zinc-400 text-sm mb-3">🔍 Détection de doublons (perceptual hash) sur les 500 dernières photos.</p>
        <CallButton busy={busy} onClick={dedup}>Lancer la détection</CallButton>
      </div>
      {out && <ResultBox text="" json={out} />}
    </div>
  );
}
