'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Sparkles, BookOpen, MessageSquare, Video, Play, Mic, Radio, ShieldAlert } from 'lucide-react';
import { AskGldAvatarLocal } from './AskGldAvatarLocal';
import { AskGldAvatarLiveAvatar } from './AskGldAvatarLiveAvatar';
import { DivineLightAvatar } from './DivineLightAvatar';
import { EmergencyModal } from './EmergencyModal';

type Source = { title: string; source: string | null; score: number };
type Msg = {
  role: 'user' | 'model';
  text: string;
  sources?: Source[];
  offTopic?: boolean;
  videoUrl?: string;       // Vidéo HeyGen si Mode Vidéo
  videoStatus?: 'pending' | 'rendering' | 'ready' | 'failed';
};

type Mode = 'text' | 'video' | 'live' | 'streaming' | 'divine';

const SUGGESTIONS = [
  'Que dit la Bible sur l\'homosexualité ?',
  'Pourquoi tant de communautés religieuses rejettent les LGBT ?',
  'Existe-t-il des églises inclusives ?',
  'Comment concilier ma foi et mon identité ?'
];

export function AskGldWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [avatarAvailable, setAvatarAvailable] = useState(false);
  const [localLiveAvailable, setLocalLiveAvailable] = useState(false);
  const [liveAvatarAvailable, setLiveAvatarAvailable] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [streamingOpen, setStreamingOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Vérifie quels modes sont disponibles
  useEffect(() => {
    fetch('/api/avatar/enabled')
      .then((r) => r.json())
      .then((j) => setAvatarAvailable(!!j.enabled))
      .catch(() => setAvatarAvailable(false));
    fetch('/api/avatar/streaming/info')
      .then((r) => r.json())
      .then((j) => {
        setLocalLiveAvailable(!!j.localLiveEnabled);
        setLiveAvatarAvailable(!!j.liveAvatarEnabled);
      })
      .catch(() => { setLocalLiveAvailable(false); setLiveAvatarAvailable(false); });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, busy]);

  // Cleanup pollers à l'unmount
  useEffect(() => () => {
    pollersRef.current.forEach((t) => clearTimeout(t));
    pollersRef.current.clear();
  }, []);

  function pollVideo(messageIndex: number, videoId: string) {
    let attempts = 0;
    const tick = async () => {
      if (attempts++ > 50) {
        updateMsg(messageIndex, { videoStatus: 'failed' });
        return;
      }
      try {
        const r = await fetch(`/api/avatar/status?id=${videoId}`);
        const j = await r.json();
        if (j.status === 'completed' && j.video_url) {
          updateMsg(messageIndex, { videoStatus: 'ready', videoUrl: j.video_url });
          return;
        }
        if (j.status === 'failed') {
          updateMsg(messageIndex, { videoStatus: 'failed' });
          return;
        }
        const t = setTimeout(tick, 3500);
        pollersRef.current.set(videoId, t);
      } catch {
        const t = setTimeout(tick, 4500);
        pollersRef.current.set(videoId, t);
      }
    };
    tick();
  }

  function updateMsg(index: number, patch: Partial<Msg>) {
    setHistory((prev) => prev.map((m, i) => i === index ? { ...m, ...patch } : m));
  }

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question) return;
    const next = [...history, { role: 'user' as const, text: question }];
    setHistory(next);
    setInput('');
    setBusy(true);

    if (mode === 'text' || !avatarAvailable) {
      // Mode texte : appel RAG simple
      try {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, locale: 'fr' })
        });
        const j = await r.json();
        setHistory([...next, {
          role: 'model',
          text: j.answer || j.text || 'Désolé, une erreur est survenue.',
          sources: j.sources || [],
          offTopic: !!j.offTopic
        }]);
      } catch {
        setHistory([...next, { role: 'model', text: 'Désolé, je ne peux pas répondre pour le moment.' }]);
      }
    } else {
      // Mode vidéo : appel avatar + polling
      try {
        const r = await fetch('/api/avatar/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, locale: 'fr' })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Erreur');
        const newMessages = [...next, {
          role: 'model' as const,
          text: j.answer || '',
          sources: j.sources || [],
          offTopic: !!j.offTopic,
          videoStatus: 'rendering' as const
        }];
        setHistory(newMessages);
        const idx = newMessages.length - 1;
        if (j.video_id) pollVideo(idx, j.video_id);
      } catch (e: any) {
        setHistory([...next, {
          role: 'model',
          text: `Je ne peux pas générer la vidéo (${e?.message || 'erreur'}). Essaie le mode Texte.`
        }]);
      }
    }
    setBusy(false);
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 group"
          aria-label="Demandez à GLD"
        >
          <span className="absolute inset-0 rounded-full bg-brand-pink animate-ping opacity-30" />
          <span className="relative flex items-center gap-2 bg-brand-pink hover:bg-brand-rose text-white pl-4 pr-5 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(255,43,177,.6)]">
            <Sparkles size={18} /> Demandez à GLD
          </span>
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-48px)] rounded-2xl shadow-[0_0_40px_rgba(255,43,177,.4)] flex flex-col overflow-hidden"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--accent)',
            color: 'var(--fg)'
          }}
        >
          {/* Header */}
          <div
            className="p-4 flex items-center justify-between"
            style={{
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(90deg, var(--halo-1), var(--halo-2))'
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--fg)' }}>Demandez à GLD</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                  Assistant inclusif IA · {mode === 'video' ? 'Mode vidéo' : 'Mode texte'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEmergencyOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-red-500/30"
                title="Urgence — contacts d'aide LGBTQ+ par pays"
              >
                <ShieldAlert size={10} /> SOS
              </button>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
            </div>
          </div>

          {/* Toggle Texte / Voix divine / Vidéo / Live local / Streaming */}
          <div className="px-3 py-2 flex gap-1 flex-wrap" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <button
              onClick={() => setMode('text')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${mode === 'text' ? 'shadow' : 'opacity-50'}`}
              style={mode === 'text'
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--fg-muted)' }}
            >
              <MessageSquare size={11} /> Texte
            </button>
            <button
              onClick={() => setMode('divine')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${mode === 'divine' ? 'shadow' : 'opacity-50'}`}
              style={mode === 'divine'
                ? { background: 'linear-gradient(90deg, #fbbf24, #f43f5e, #a855f7, #06b6d4)', color: '#fff' }
                : { color: 'var(--fg-muted)' }}
              title="Voix divine — IA vocale gratuite avec animation lumière"
            >
              ✨ Voix divine
            </button>
          </div>

          {/* Toggle Vidéo / Live local / Streaming (anciens modes) */}
          {(avatarAvailable || localLiveAvailable || liveAvatarAvailable) && (
            <div className="px-3 py-2 flex gap-1 flex-wrap" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <span className="text-[10px] text-zinc-400 self-center mr-1">Avatars premium :</span>
              {avatarAvailable && (
                <button
                  onClick={() => setMode('video')}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${mode === 'video' ? 'shadow' : 'opacity-50'}`}
                  style={mode === 'video'
                    ? { background: 'linear-gradient(90deg, #d946ef, #ec4899)', color: '#fff' }
                    : { color: 'var(--fg-muted)' }}
                >
                  <Video size={11} /> Vidéo
                </button>
              )}
              {localLiveAvailable && (
                <button
                  onClick={() => { setMode('live'); setLiveOpen(true); }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${mode === 'live' ? 'shadow' : 'opacity-50'}`}
                  style={mode === 'live'
                    ? { background: 'linear-gradient(90deg, #ec4899, #f43f5e)', color: '#fff' }
                    : { color: 'var(--fg-muted)' }}
                  title="Conversation vocale gratuite avec ElevenLabs"
                >
                  <Mic size={11} /> Live
                  <span className="text-[8px] opacity-80">gratuit</span>
                </button>
              )}
              {liveAvatarAvailable && (
                <button
                  onClick={() => { setMode('streaming'); setStreamingOpen(true); }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${mode === 'streaming' ? 'shadow' : 'opacity-50'}`}
                  style={mode === 'streaming'
                    ? { background: 'linear-gradient(90deg, #a855f7, #d946ef)', color: '#fff' }
                    : { color: 'var(--fg-muted)' }}
                  title="Avatar streaming temps-réel via LiveAvatar.com"
                >
                  <Radio size={11} /> Streaming
                  <span className="text-[8px] opacity-80">2 min</span>
                </button>
              )}
            </div>
          )}

          {/* Mode VOIX DIVINE — image cathédrale + voix bidirectionnelle */}
          {mode === 'divine' && (
            <div className="flex-1 overflow-y-auto p-2">
              <DivineLightAvatar />
            </div>
          )}

          {/* Messages (texte/vidéo classiques) */}
          {mode !== 'divine' && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {history.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Bonjour 🌈 Je suis GLD, l'assistant du mouvement. Je réponds avec apaisement aux questions sur la foi et la diversité.
                  {avatarAvailable && mode === 'video' && (
                    <span className="block mt-1 opacity-80">📹 Mode vidéo activé — chaque réponse arrive sous forme de courte vidéo (~30 secondes de génération).</span>
                  )}
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg transition"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--fg-muted)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {history.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Vidéo (mode vidéo, message du bot) */}
                {m.role === 'model' && m.videoStatus && (
                  <div className="w-full max-w-[85%] rounded-2xl overflow-hidden bg-zinc-900" style={{ aspectRatio: '3/4' }}>
                    {m.videoStatus === 'ready' && m.videoUrl ? (
                      <video src={m.videoUrl} controls autoPlay playsInline className="w-full h-full object-cover" />
                    ) : m.videoStatus === 'failed' ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-400 text-xs">
                        <span className="text-2xl mb-2">😔</span>
                        Génération vidéo échouée
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs"
                        style={{ background: 'var(--avatar-bg, linear-gradient(135deg, #FBEAF0, #EEEDFE))', color: 'var(--fg)' }}>
                        <Loader2 size={20} className="animate-spin mb-2" style={{ color: 'var(--accent)' }} />
                        <span className="font-bold" style={{ color: 'var(--fg)' }}>L'avatar prépare sa réponse…</span>
                        <span className="mt-1" style={{ color: 'var(--fg-muted)' }}>~30 secondes</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Texte de la réponse (toujours affiché) */}
                {m.text && (
                  <div
                    className="max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap"
                    style={
                      m.role === 'user'
                        ? { background: 'var(--accent)', color: '#fff' }
                        : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }
                    }
                  >
                    {m.text}
                  </div>
                )}
                {/* Sources */}
                {m.role === 'model' && m.sources && m.sources.length > 0 && !m.offTopic && (
                  <div className="max-w-[85%] flex flex-wrap gap-1 px-1">
                    {m.sources.slice(0, 3).map((src, k) => (
                      <span
                        key={k}
                        title={src.source || ''}
                        className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
                        style={{ background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                      >
                        <BookOpen size={9} />
                        {src.title.length > 28 ? src.title.slice(0, 28) + '…' : src.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-3 py-2 text-xs flex items-center gap-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                >
                  <Loader2 size={12} className="animate-spin" /> GLD réfléchit…
                </div>
              </div>
            )}
          </div>
          )}

          {/* Input — caché en mode divine (le mic du DivineLightAvatar suffit) */}
          {mode !== 'divine' && (
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 flex gap-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'video' ? 'Pose ta question (réponse en vidéo)…' : 'Pose ta question…'}
              disabled={busy}
              className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
            <button type="submit" disabled={busy || !input}
              className="disabled:opacity-50 text-white rounded-full p-2"
              style={{ background: mode === 'video' ? 'linear-gradient(90deg, #d946ef, #ec4899)' : 'var(--accent)' }}
              aria-label="envoyer">
              <Send size={16} />
            </button>
          </form>
          )}
        </div>
      )}

      {/* Modal Live local (overlay plein écran) */}
      {liveOpen && (
        <AskGldAvatarLocal onClose={() => { setLiveOpen(false); setMode('text'); }} />
      )}

      {/* Modal Streaming LiveAvatar (overlay plein écran) */}
      {streamingOpen && (
        <AskGldAvatarLiveAvatar onClose={() => { setStreamingOpen(false); setMode('text'); }} />
      )}

      {/* Modal Urgence LGBT — bouton SOS */}
      {emergencyOpen && (
        <EmergencyModal onClose={() => setEmergencyOpen(false)} />
      )}
    </>
  );
}
