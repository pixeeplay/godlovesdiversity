'use client';
import { useState } from 'react';
import {
  Sparkles, Loader2, Image as ImageIcon, Type, Languages,
  BarChart3, Calendar, Heart, Wand2, ScanFace, Copy, Music,
  Share2, Hash, Search, MessageCircle, Mail, Send, ArrowLeft,
  Eye, TrendingUp, FileText
} from 'lucide-react';
import { HeroVisualsAdmin } from './HeroVisualsAdmin';
import { MusicGenerator } from './MusicGenerator';

type Tool = {
  id: string;
  group: 'visuals' | 'content' | 'social' | 'analytics' | 'seo' | 'comms';
  icon: any;
  title: string;
  desc: string;
  badge?: 'NEW' | 'POPULAR' | 'PRO';
  gradient: string;
  comingSoon?: boolean;
};

const TOOLS: Tool[] = [
  // Visuels & Images
  { id: 'visuals', group: 'visuals', icon: Wand2, title: 'Visuels Hero', desc: 'Génère des images cathédrale + arc-en-ciel pour la home (Imagen / Nano Banana)', gradient: 'from-pink-500 to-fuchsia-500', badge: 'POPULAR' },
  { id: 'music', group: 'visuals', icon: Music, title: 'Musique IA', desc: '9 thèmes ambiants : pride anthem, club, tea dance, drag, ballroom, ambient queer…', gradient: 'from-violet-500 to-purple-500', badge: 'NEW' },
  { id: 'photo-tools', group: 'visuals', icon: ScanFace, title: 'Outils photo', desc: 'Floutage visages, détection doublons, analyse Vision Gemini', gradient: 'from-cyan-500 to-blue-500' },
  { id: 'caption', group: 'visuals', icon: ImageIcon, title: 'Légende photo', desc: 'Décrit une photo en 80 mots avec hashtags inclusifs', gradient: 'from-rose-500 to-pink-500' },

  // Texte & Contenu
  { id: 'testimony', group: 'content', icon: Heart, title: 'Polir un témoignage', desc: 'Réécrit un témoignage brut en version publiable, anonymisée et lumineuse', gradient: 'from-rose-500 to-orange-500' },
  { id: 'translate', group: 'content', icon: Languages, title: 'Traduction', desc: 'Traduit en EN/ES/PT en gardant le ton inclusif et apaisé', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'verse', group: 'content', icon: Sparkles, title: 'Verset du jour', desc: 'Génère un message inspirant quotidien non confessionnel', gradient: 'from-amber-500 to-yellow-500' },
  { id: 'newsletter', group: 'content', icon: Type, title: 'Newsletter mensuelle', desc: 'Compose une newsletter HTML à partir des stats du mois', gradient: 'from-indigo-500 to-violet-500' },

  // Social
  { id: 'variants', group: 'social', icon: Share2, title: 'Variantes social', desc: 'Génère 5 variantes d\'un post pour Instagram / X / LinkedIn / FB / TikTok', gradient: 'from-pink-500 to-rose-500' },
  { id: 'pack-social', group: 'social', icon: Send, title: '🚀 Pack social complet', desc: '1 photo → 5 posts prêts à publier sur tous les réseaux + hashtags + visuels', gradient: 'from-fuchsia-500 to-pink-500', badge: 'NEW' },
  { id: 'hashtags', group: 'social', icon: Hash, title: 'Hashtags optimaux', desc: 'Top hashtags par plateforme, par thème, par localisation', gradient: 'from-purple-500 to-pink-500', badge: 'NEW' },
  { id: 'calendar', group: 'social', icon: Calendar, title: 'Calendrier éditorial IA', desc: 'Suggère un planning de posts pour 30 jours basé sur les fêtes interreligieuses', gradient: 'from-blue-500 to-indigo-500' },

  // Analytics
  { id: 'sentiment', group: 'analytics', icon: BarChart3, title: 'Analyse sentiment', desc: 'Détecte l\'émotion dominante d\'un témoignage (joie/espoir/colère…)', gradient: 'from-emerald-500 to-green-500' },
  { id: 'cluster', group: 'analytics', icon: BarChart3, title: 'Clustering thèmes', desc: 'Regroupe automatiquement les témoignages par thématique', gradient: 'from-cyan-500 to-teal-500' },
  { id: 'weekly', group: 'analytics', icon: TrendingUp, title: 'Synthèse hebdo', desc: 'Rapport hebdomadaire pour l\'équipe avec actions prioritaires', gradient: 'from-blue-500 to-cyan-500' },

  // SEO
  { id: 'seo-meta', group: 'seo', icon: Search, title: 'Meta SEO auto', desc: 'Génère titre + description Google optimisés pour chaque page', gradient: 'from-orange-500 to-red-500', badge: 'NEW' },
  { id: 'seo-keywords', group: 'seo', icon: Hash, title: 'Mots-clés SEO', desc: 'Suggère les meilleurs mots-clés pour ranker sur Google', gradient: 'from-yellow-500 to-orange-500', badge: 'NEW' },

  // Communication
  { id: 'comment-reply', group: 'comms', icon: MessageCircle, title: 'Réponse commentaires', desc: 'Suggère des réponses bienveillantes aux commentaires des photos', gradient: 'from-pink-500 to-violet-500', badge: 'NEW' },
  { id: 'email-reply', group: 'comms', icon: Mail, title: 'Réponse email IA', desc: 'Brouillon de réponse à un email de soutien ou de question', gradient: 'from-violet-500 to-pink-500', badge: 'NEW' }
];

const GROUPS = [
  { id: 'visuals',   label: '🎨 Visuels & Images',   color: 'text-pink-400' },
  { id: 'content',   label: '📝 Textes & Contenu',   color: 'text-amber-400' },
  { id: 'social',    label: '📱 Réseaux sociaux',    color: 'text-fuchsia-400' },
  { id: 'analytics', label: '📊 Analytics',          color: 'text-emerald-400' },
  { id: 'seo',       label: '🔍 SEO Google/Bing',    color: 'text-orange-400' },
  { id: 'comms',     label: '💬 Communication',      color: 'text-violet-400' }
] as const;

export function AIStudio() {
  const [active, setActive] = useState<string | null>(null);

  if (!active) {
    return (
      <div className="space-y-8">
        {/* Hero stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Wand2} value={TOOLS.length} label="Outils IA dispo" gradient="from-pink-500 to-violet-500" />
          <Stat icon={Sparkles} value="Gemini" label="Texte + Vision" gradient="from-cyan-500 to-blue-500" />
          <Stat icon={ImageIcon} value="Imagen" label="Génération image" gradient="from-emerald-500 to-teal-500" />
          <Stat icon={Music} value="ElevenLabs" label="Musique ambient" gradient="from-violet-500 to-fuchsia-500" />
        </div>

        {/* Tools grouped */}
        {GROUPS.map((g) => {
          const tools = TOOLS.filter((t) => t.group === g.id);
          if (tools.length === 0) return null;
          return (
            <section key={g.id}>
              <h2 className={`text-sm uppercase tracking-widest font-bold mb-3 ${g.color}`}>{g.label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {tools.map((t) => <ToolCard key={t.id} t={t} onClick={() => setActive(t.id)} />)}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const tool = TOOLS.find((t) => t.id === active);

  return (
    <div>
      <button onClick={() => setActive(null)} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm">
        <ArrowLeft size={16} /> Retour au Studio IA
      </button>

      {tool && (
        <div className={`bg-gradient-to-br ${tool.gradient} rounded-2xl p-6 mb-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-3"><tool.icon size={32} /></div>
            <div>
              <h1 className="text-2xl font-bold">{tool.title}</h1>
              <p className="text-white/85 text-sm">{tool.desc}</p>
            </div>
          </div>
        </div>
      )}

      {active === 'visuals' && <HeroVisualsAdmin />}
      {active === 'music' && <MusicGenerator />}
      {active === 'caption' && <CaptionTab />}
      {active === 'testimony' && <TestimonyTab />}
      {active === 'variants' && <VariantsTab />}
      {active === 'translate' && <TranslateTab />}
      {active === 'newsletter' && <NewsletterTab />}
      {active === 'sentiment' && <SentimentTab />}
      {active === 'cluster' && <ClusterTab />}
      {active === 'weekly' && <WeeklyTab />}
      {active === 'calendar' && <CalendarTab />}
      {active === 'verse' && <VerseTab />}
      {active === 'photo-tools' && <PhotoToolsTab />}
      {active === 'pack-social' && <PackSocialTab />}
      {active === 'hashtags' && <HashtagsTab />}
      {active === 'seo-meta' && <SeoMetaTab />}
      {active === 'seo-keywords' && <SeoKeywordsTab />}
      {active === 'comment-reply' && <CommentReplyTab />}
      {active === 'email-reply' && <EmailReplyTab />}
    </div>
  );
}

function ToolCard({ t, onClick }: { t: Tool; onClick: () => void }) {
  const Icon = t.icon;
  return (
    <button onClick={onClick}
            className="group text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-brand-pink/40 rounded-2xl p-4 transition relative overflow-hidden">
      {t.badge && (
        <span className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${t.badge === 'NEW' ? 'bg-emerald-500 text-white' : t.badge === 'POPULAR' ? 'bg-brand-pink text-white' : 'bg-amber-500 text-black'}`}>
          {t.badge}
        </span>
      )}
      <div className={`inline-flex w-12 h-12 rounded-xl bg-gradient-to-br ${t.gradient} items-center justify-center mb-3 group-hover:scale-110 transition shadow-lg`}>
        <Icon size={22} className="text-white" />
      </div>
      <h3 className="font-bold text-white mb-1 group-hover:text-brand-pink transition">{t.title}</h3>
      <p className="text-xs text-zinc-400 line-clamp-2">{t.desc}</p>
    </button>
  );
}

function Stat({ icon: Icon, value, label, gradient }: any) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white shadow-lg`}>
      <Icon size={20} className="opacity-90 mb-2" />
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-90 mt-1">{label}</div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────── */

function CallButton({ busy, children, ...props }: any) {
  return (
    <button disabled={busy} {...props} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-sm">
      {busy ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} {children}
    </button>
  );
}

function ResultBox({ output, mock }: { output: string; mock?: boolean }) {
  if (!output) return null;
  return (
    <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
      {mock && <p className="text-amber-400 text-xs mb-2">⚠️ Mode démo (clé Gemini absente)</p>}
      <button onClick={() => navigator.clipboard.writeText(output)}
              className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400" title="Copier">
        <Copy size={14} />
      </button>
      <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans">{output}</pre>
    </div>
  );
}

function Card({ children, hint }: { children: any; hint?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      {hint && <p className="text-xs text-zinc-400 italic">{hint}</p>}
      {children}
    </div>
  );
}

/* ─── ONGLETS EXISTANTS ────────────────────── */

function CaptionTab() {
  const [url, setUrl] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/caption-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: url }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Colle une URL d'image (de la galerie ou ailleurs). Gemini Vision la décrit en 80 mots avec hashtags inclusifs.">
      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="https://gld.pixeeplay.com/api/storage/..." value={url} onChange={(e) => setUrl(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer la légende</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function TestimonyTab() {
  const [text, setText] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/polish-testimony', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, anonymize: true }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Colle le texte brut d'un témoignage. L'IA va le réécrire en gardant l'intention, anonymisé, en max 100 mots.">
      <textarea rows={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Colle le témoignage brut ici…" value={text} onChange={(e) => setText(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Polir le témoignage</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function VariantsTab() {
  const [brief, setBrief] = useState('');
  const [network, setNetwork] = useState('Instagram');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/post-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief, network, count: 5 }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Décris ton message (1-2 phrases) et choisis le réseau. L'IA produit 5 variantes différentes adaptées.">
      <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" value={network} onChange={(e) => setNetwork(e.target.value)}>
        <option>Instagram</option><option>X / Twitter</option><option>LinkedIn</option><option>Facebook</option><option>TikTok</option>
      </select>
      <textarea rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Brief : annoncer la sortie d'une nouvelle affiche…" value={brief} onChange={(e) => setBrief(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer 5 variantes</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function TranslateTab() {
  const [text, setText] = useState('');
  const [target, setTarget] = useState<'en' | 'es' | 'pt'>('en');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, target }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Traduit en gardant le ton chaleureux et inclusif. Conserve le formatage (gras, listes…).">
      <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" value={target} onChange={(e) => setTarget(e.target.value as any)}>
        <option value="en">English 🇬🇧</option><option value="es">Español 🇪🇸</option><option value="pt">Português 🇵🇹</option>
      </select>
      <textarea rows={5} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Traduire</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function NewsletterTab() {
  const [stats, setStats] = useState('{ "newPhotos": 12, "newSubs": 5 }');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stats });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="L'IA génère une newsletter HTML complète à partir des stats du mois (max 250 mots).">
      <textarea rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" value={stats} onChange={(e) => setStats(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer la newsletter</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function SentimentTab() {
  const [text, setText] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Renvoie un JSON avec l'émotion dominante, intensité 1-10, et synthèse en 1 phrase.">
      <textarea rows={5} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Analyser le sentiment</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function ClusterTab() {
  return <Card hint="🔧 Importer N témoignages et l'IA les regroupe en 3-6 clusters thématiques. À brancher sur un picker de témoignages."><p className="text-zinc-500 text-sm">Disponible via API directe — UI picker à venir V2.</p></Card>;
}

function WeeklyTab() {
  return <Card hint="Synthèse hebdomadaire automatique générée chaque lundi via le scheduled task admin."><p className="text-zinc-500 text-sm">Configure dans /admin/calendar → tâche récurrente.</p></Card>;
}

function CalendarTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Pour le mois choisi, l'IA liste les événements religieux + LGBT+ et propose un post pour chacun.">
      <input type="month" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer le calendrier</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function VerseTab() {
  const [theme, setTheme] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const r = await fetch('/api/admin/ai/verse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Message inspirant non-confessionnel (1-2 phrases lumineuses). Utile pour le verset du jour.">
      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Thème (optionnel) : pardon, amour, courage…" value={theme} onChange={(e) => setTheme(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer un verset</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function PhotoToolsTab() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card hint="Floute automatiquement les visages d'une photo (Gemini Vision + Sharp).">
        <p className="text-sm text-zinc-300">Endpoint : <code className="text-brand-pink">POST /api/admin/photos/[id]/blur</code></p>
        <p className="text-xs text-zinc-500">Disponible aussi depuis la page Modération.</p>
      </Card>
      <Card hint="Détecte les doublons via perceptual hash (image-hash).">
        <p className="text-sm text-zinc-300">Endpoint : <code className="text-brand-pink">POST /api/admin/photos/dedup</code></p>
      </Card>
    </div>
  );
}

/* ─── NOUVEAUX OUTILS ─────────────────────── */

function PackSocialTab() {
  const [imageUrl, setImageUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    // Génère 5 posts en 1 appel via post-variants × 5 réseaux
    const networks = ['Instagram', 'X / Twitter', 'LinkedIn', 'Facebook', 'TikTok'];
    let combined = '';
    for (const net of networks) {
      const r = await fetch('/api/admin/ai/post-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief: topic + (imageUrl ? `\nImage: ${imageUrl}` : ''), network: net, count: 1 }) });
      const j = await r.json();
      combined += `\n\n━━━ ${net.toUpperCase()} ━━━\n${j.text || ''}`;
    }
    setOut(combined.trim()); setBusy(false);
  }
  return (
    <Card hint="🚀 1 photo + 1 idée = 5 posts prêts à publier (FB / IG / X / LinkedIn / TikTok). Idéal pour ne pas réécrire 5 fois.">
      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="URL image (optionnel)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      <textarea rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Sujet : annoncer la marche des fiertés interreligieuse du 14 juin…" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <CallButton busy={busy} onClick={go}>{busy ? 'Génération 5 réseaux…' : 'Générer le pack 5 réseaux'}</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function HashtagsTab() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const prompt = `Liste les 30 meilleurs hashtags ${platform} pour le sujet : "${topic}". Mix : 10 grands tags (>1M), 10 moyens (100k-1M), 10 niches (<100k). Domaine : foi inclusive LGBT+. Format : un hashtag par ligne, du plus large au plus niche, sans numérotation.`;
    const r = await fetch('/api/admin/ai/post-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief: prompt, network: platform, count: 1 }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="30 hashtags optimisés (10 large + 10 moyen + 10 niche) pour le sujet et la plateforme choisie.">
      <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" value={platform} onChange={(e) => setPlatform(e.target.value)}>
        <option>Instagram</option><option>TikTok</option><option>LinkedIn</option><option>X / Twitter</option><option>YouTube</option>
      </select>
      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Sujet : marche fiertés Paris, témoignage musulman gay…" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer 30 hashtags</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function SeoMetaTab() {
  const [pageUrl, setPageUrl] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const prompt = `Tu es un expert SEO. Pour cette page :\nURL: ${pageUrl}\nContenu (extrait):\n"""${pageContent.slice(0, 1500)}"""\n\nGénère :\n1. UN TITLE optimisé Google (max 60 caractères, contient mot-clé principal, mention "parislgbt")\n2. UNE META DESCRIPTION (max 155 caractères, incitative, contient verbe d'action)\n3. 5 MOTS-CLÉS principaux (par ordre de priorité)\n4. SUGGESTION OG IMAGE alt (description courte de l'image idéale)\n\nFormat clair avec labels.`;
    const r = await fetch('/api/admin/ai/post-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief: prompt, network: 'LinkedIn', count: 1 }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="🔍 Génère le title et la meta description optimaux Google pour une page (max 60 + 155 caractères).">
      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="URL : /argumentaire" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
      <textarea rows={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Colle un extrait du contenu de la page…" value={pageContent} onChange={(e) => setPageContent(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer meta SEO</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function SeoKeywordsTab() {
  const [topic, setTopic] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const prompt = `Liste les 30 meilleurs mots-clés SEO français pour le sujet : "${topic}", dans le contexte du mouvement parislgbt (foi inclusive LGBT+).\nMix : 10 mots-clés courts/concurrentiels, 10 longue traîne (3-5 mots), 10 questions exactes que les gens tapent dans Google.\nFormat : un par ligne, sans numérotation, sans caractère spécial.`;
    const r = await fetch('/api/admin/ai/post-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief: prompt, network: 'LinkedIn', count: 1 }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="30 mots-clés SEO classés (concurrentiels / longue traîne / questions Google).">
      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Sujet : église inclusive Paris" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Générer les mots-clés</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function CommentReplyTab() {
  const [comment, setComment] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const prompt = `Quelqu'un a posté ce commentaire sur le site parislgbt :\n"""${comment}"""\n\nPropose 3 réponses bienveillantes différentes (tons : chaleureux, factuel, spirituel). Chacune en 2-3 phrases max, ton inclusif et apaisé. Format : "Option 1: ..." etc.`;
    const r = await fetch('/api/admin/ai/post-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief: prompt, network: 'LinkedIn', count: 1 }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="3 propositions de réponse bienveillante à un commentaire (chaleureux / factuel / spirituel).">
      <textarea rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Colle le commentaire reçu…" value={comment} onChange={(e) => setComment(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Suggérer 3 réponses</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}

function EmailReplyTab() {
  const [email, setEmail] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut('');
    const prompt = `Quelqu'un a écrit cet email à parislgbt :\n"""${email}"""\n\nRédige un brouillon de réponse (max 200 mots) :\n- Ton chaleureux et personnel\n- Reformule pour montrer qu'on a bien compris\n- Réponds aux questions s'il y en a\n- Termine par une formule humaine (pas "cordialement")\nSi l'email est sensible (souffrance, doute spirituel), oriente avec délicatesse vers une ressource.`;
    const r = await fetch('/api/admin/ai/post-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief: prompt, network: 'LinkedIn', count: 1 }) });
    const j = await r.json(); setOut(j.text || ''); setBusy(false);
  }
  return (
    <Card hint="Brouillon de réponse à un email (max 200 mots, ton chaleureux). Toujours à relire avant envoi.">
      <textarea rows={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" placeholder="Colle l'email reçu…" value={email} onChange={(e) => setEmail(e.target.value)} />
      <CallButton busy={busy} onClick={go}>Rédiger un brouillon</CallButton>
      <ResultBox output={out} />
    </Card>
  );
}
