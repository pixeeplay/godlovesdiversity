'use client';
import { useEffect, useState } from 'react';
import { Video, Loader2, Sparkles, Plus, Send, Play, RefreshCw, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Avatar {
  id: string;
  slug: string;
  name: string;
  persona: string | null;
  provider: string;
  externalId: string;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  status: string;
  trainingError: string | null;
  voiceId: string | null;
  createdAt: string;
}

interface Generation {
  id: string;
  avatarId: string;
  scriptText: string;
  videoUrl: string | null;
  durationSec: number | null;
  outfit: string | null;
  setting: string | null;
  language: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  avatar?: { name: string; persona: string | null };
}

const PERSONAS = [
  { id: 'marie',   label: 'Mère Marie (catho inclusive)',  emoji: '🕊️' },
  { id: 'khadija', label: 'Sœur Khadija (islam progressiste)', emoji: '☪️' },
  { id: 'rabbin',  label: 'Rav Yossef (Beit Haverim)',     emoji: '✡️' },
  { id: 'zen',     label: 'Maître Tenku (zen)',            emoji: '🧘' }
];

const PROVIDERS = [
  { id: 'avatar-v',  label: 'Avatar V (HeyGen)',     desc: 'Upper-body, cross-outfits, 15s clip source' },
  { id: 'heygen',    label: 'HeyGen classique',       desc: 'Avatar studio + temps-réel' },
  { id: 'tavus',     label: 'Tavus',                  desc: 'Conversationnel temps-réel' },
  { id: 'synthesia', label: 'Synthesia',              desc: '160 avatars stock pré-entraînés' },
  { id: 'd-id',      label: 'D-ID',                   desc: 'Talking-head depuis photo' }
];

const OUTFITS = ['casual', 'robe-religieuse', 'officiel', 'tenue-traditionnelle', 'libre'];
const SETTINGS = ['studio-noir', 'eglise', 'mosquee', 'synagogue', 'temple', 'jardin', 'bureau', 'naturel'];

export function AvatarStudioClient() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', persona: '', provider: 'avatar-v', sourceVideoUrl: '' });
  const [creating, setCreating] = useState(false);
  const [generateAvatar, setGenerateAvatar] = useState<Avatar | null>(null);
  const [genForm, setGenForm] = useState({ scriptText: '', outfit: 'libre', setting: 'studio-noir', language: 'fr' });
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/avatar-studio');
      const j = await r.json();
      setAvatars(j.avatars || []);
      setGenerations(j.recentGenerations || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Auto-poll si générations en cours
  useEffect(() => {
    const hasProcessing = generations.some(g => g.status === 'processing' || g.status === 'pending');
    if (!hasProcessing) return;
    const i = setInterval(pollNow, 15_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generations.map(g => g.status).join(',')]);

  async function createReplica() {
    if (!createForm.name || !createForm.sourceVideoUrl) { setMsg('⚠ Nom + URL clip 15s requis'); return; }
    setCreating(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/avatar-studio?action=create-replica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      const j = await r.json();
      if (r.ok) {
        setMsg('✓ Avatar créé — entraînement lancé');
        setCreateForm({ name: '', persona: '', provider: 'avatar-v', sourceVideoUrl: '' });
        setShowCreate(false);
        load();
      } else setMsg(`⚠ ${j.error || j.message}`);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setCreating(false);
  }

  async function generateVideo() {
    if (!generateAvatar || !genForm.scriptText.trim()) { setMsg('⚠ Script requis'); return; }
    setGenerating(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/avatar-studio?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: generateAvatar.id, ...genForm })
      });
      const j = await r.json();
      if (r.ok) {
        setMsg('✓ Génération lancée — sera dispo dans 1-3 min');
        setGenForm({ scriptText: '', outfit: 'libre', setting: 'studio-noir', language: 'fr' });
        setGenerateAvatar(null);
        load();
      } else setMsg(`⚠ ${j.error || j.message}`);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setGenerating(false);
  }

  async function pollNow() {
    setPolling(true);
    try {
      await fetch('/api/admin/avatar-studio?action=poll', { method: 'POST' });
      load();
    } catch {}
    setPolling(false);
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 rounded-2xl p-3">
            <Video size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">Avatar Studio</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Avatar V (HeyGen v5) · Tavus · Synthesia · D-ID — donne un visage aux 4 personas spirituels et automatise les vidéos newsletter.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={pollNow} disabled={polling} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5">
            <RefreshCw size={11} className={polling ? 'animate-spin' : ''} /> Rafraîchir générations
          </button>
          <button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
            <Plus size={11} /> Nouvel avatar
          </button>
        </div>
      </header>

      {msg && <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-3 text-sm text-fuchsia-200">{msg}</div>}

      {/* Cas d'usage proposés */}
      <section className="bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-violet-500/10 border border-amber-500/30 rounded-2xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-300" /> Cas d'usage prêts pour GLD
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-2xl mb-2">🕊️</div>
            <strong>4 personas spirituels avec visage</strong>
            <p className="text-zinc-400 mt-1">Mère Marie, Sœur Khadija, Rav Yossef, Maître Tenku — chacun avec son avatar, voix, tenue (Avatar V cross-outfits).</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-2xl mb-2">📧</div>
            <strong>Newsletter vidéo hebdo auto</strong>
            <p className="text-zinc-400 mt-1">Lundi matin : Gemini écrit le script, Avatar V génère la vidéo, push Telegram + email.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-2xl mb-2">🎥</div>
            <strong>Témoignages anonymisés</strong>
            <p className="text-zinc-400 mt-1">User envoie audio + texte → avatar GLD raconte le témoignage avec sous-titres FR/EN/ES/PT.</p>
          </div>
        </div>
      </section>

      {/* Mes avatars */}
      <section>
        <h2 className="text-xs uppercase font-bold tracking-widest text-fuchsia-400 mb-3">
          Mes avatars ({avatars.length})
        </h2>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-zinc-500" /></div>
        ) : avatars.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            <Video size={36} className="mx-auto mb-2 opacity-30" />
            Aucun avatar pour l'instant. Crée le premier en cliquant "Nouvel avatar".
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {avatars.map(a => (
              <article key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-fuchsia-500/40 transition">
                <div className="aspect-video bg-zinc-950 relative">
                  {a.previewVideoUrl ? (
                    <video src={a.previewVideoUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  ) : a.thumbnailUrl ? (
                    <img src={a.thumbnailUrl} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      {a.persona === 'marie' ? '🕊️' : a.persona === 'khadija' ? '☪️' : a.persona === 'rabbin' ? '✡️' : a.persona === 'zen' ? '🧘' : '🎭'}
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.status === 'ready' ? 'bg-emerald-500 text-white' :
                    a.status === 'training' ? 'bg-amber-500 text-black animate-pulse' :
                    'bg-rose-500 text-white'
                  }`}>
                    {a.status === 'ready' ? '✓ READY' : a.status === 'training' ? '⏳ TRAINING' : '❌ FAILED'}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm">{a.name}</h3>
                  <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="text-fuchsia-400 font-bold">{a.provider}</span>
                    {a.persona && <span>· persona {PERSONAS.find(p => p.id === a.persona)?.emoji}</span>}
                    <code className="text-[9px] bg-zinc-950 px-1 rounded">{a.externalId.slice(0, 16)}</code>
                  </div>
                  {a.trainingError && (
                    <p className="text-[10px] text-rose-300 mt-2 line-clamp-2">⚠ {a.trainingError}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setGenerateAvatar(a)}
                      disabled={a.status !== 'ready'}
                      className="flex-1 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-full flex items-center justify-center gap-1"
                    >
                      <Play size={10} /> Générer vidéo
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Générations récentes */}
      <section>
        <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400 mb-3">
          Générations récentes ({generations.length})
        </h2>
        {generations.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
            Pas encore de vidéos générées.
          </div>
        ) : (
          <div className="space-y-2">
            {generations.map(g => (
              <article key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
                <div className="w-12 h-12 bg-zinc-950 rounded-lg flex items-center justify-center text-xl">
                  {g.avatar?.persona === 'marie' ? '🕊️' : g.avatar?.persona === 'khadija' ? '☪️' : g.avatar?.persona === 'rabbin' ? '✡️' : g.avatar?.persona === 'zen' ? '🧘' : '🎭'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm">{g.avatar?.name || 'Avatar'}</span>
                    {g.outfit && <span className="text-[10px] bg-amber-500/15 text-amber-200 px-1.5 py-0.5 rounded">👗 {g.outfit}</span>}
                    {g.setting && <span className="text-[10px] bg-cyan-500/15 text-cyan-200 px-1.5 py-0.5 rounded">📍 {g.setting}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      g.status === 'done' ? 'bg-emerald-500/20 text-emerald-200' :
                      g.status === 'processing' || g.status === 'pending' ? 'bg-amber-500/20 text-amber-200' :
                      'bg-rose-500/20 text-rose-200'
                    }`}>
                      {g.status === 'done' ? '✓ DONE' : g.status === 'processing' ? '⏳ PROCESSING' : g.status === 'pending' ? '⏸ PENDING' : '❌ FAILED'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2">{g.scriptText}</p>
                  {g.errorMessage && <p className="text-[11px] text-rose-300 mt-1">⚠ {g.errorMessage}</p>}
                </div>
                {g.videoUrl && (
                  <a href={g.videoUrl} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:underline text-xs flex items-center gap-1 shrink-0">
                    <ExternalLink size={11} /> Voir
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal création */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-zinc-950 border border-fuchsia-500/40 rounded-2xl p-5 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-4">🎬 Créer un nouvel avatar</h3>
            <div className="space-y-3">
              <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nom de l'avatar (ex: Mère Marie)" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
              <select value={createForm.persona} onChange={(e) => setCreateForm({ ...createForm, persona: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Persona (optionnel)</option>
                {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
              </select>
              <select value={createForm.provider} onChange={(e) => setCreateForm({ ...createForm, provider: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>)}
              </select>
              <input value={createForm.sourceVideoUrl} onChange={(e) => setCreateForm({ ...createForm, sourceVideoUrl: e.target.value })} placeholder="URL clip vidéo source 15s (MinIO ou public)" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
              <p className="text-[10px] text-zinc-500 italic">
                💡 Pour Avatar V/Tavus : upload un clip 15s regard caméra, parole claire. Synthesia/D-ID : utilisent des avatars stock, l'URL sert juste à générer un thumb.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white text-sm px-3 py-2">Annuler</button>
              <button onClick={createReplica} disabled={creating} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal génération */}
      {generateAvatar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setGenerateAvatar(null)}>
          <div className="bg-zinc-950 border border-fuchsia-500/40 rounded-2xl p-5 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-4">🎥 Générer une vidéo avec {generateAvatar.name}</h3>
            <div className="space-y-3">
              <textarea
                value={genForm.scriptText}
                onChange={(e) => setGenForm({ ...genForm, scriptText: e.target.value })}
                rows={5}
                placeholder="Script à dire à l'écran (sera converti en TTS)…"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <select value={genForm.outfit} onChange={(e) => setGenForm({ ...genForm, outfit: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs">
                  {OUTFITS.map(o => <option key={o} value={o}>👗 {o}</option>)}
                </select>
                <select value={genForm.setting} onChange={(e) => setGenForm({ ...genForm, setting: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs">
                  {SETTINGS.map(s => <option key={s} value={s}>📍 {s}</option>)}
                </select>
                <select value={genForm.language} onChange={(e) => setGenForm({ ...genForm, language: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs">
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="pt">🇵🇹 Português</option>
                  <option value="ar">🇸🇦 العربية</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setGenerateAvatar(null)} className="text-zinc-400 hover:text-white text-sm px-3 py-2">Annuler</button>
              <button onClick={generateVideo} disabled={generating} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                {generating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Générer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
