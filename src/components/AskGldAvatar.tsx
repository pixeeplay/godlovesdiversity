'use client';
import { useState, useEffect, useRef } from 'react';
import { Video, X, Loader2, Send, BookOpen, Sparkles } from 'lucide-react';

type Source = { title: string; source: string | null; score: number };
type State = 'idle' | 'asking' | 'rendering' | 'ready' | 'error';

/**
 * Widget public « GLD Live » — un avatar HeyGen qui répond en vidéo,
 * piloté par le RAG « Demandez à GLD ».
 *
 * S'affiche à côté du widget chat texte si avatar.enabled = '1'.
 */
export function AskGldAvatar() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<State>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  async function ask() {
    const q = question.trim();
    if (!q || state === 'asking' || state === 'rendering') return;
    setState('asking');
    setError('');
    setVideoUrl(null);
    setVideoId(null);
    setAnswer('');
    setSources([]);

    try {
      const r = await fetch('/api/avatar/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, locale: 'fr' })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur');
      setAnswer(j.answer || '');
      setSources(j.sources || []);
      setVideoId(j.video_id);
      setState('rendering');
      poll(j.video_id);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
      setState('error');
    }
  }

  async function poll(id: string) {
    let attempts = 0;
    const tick = async () => {
      if (attempts++ > 50) { setState('error'); setError('Délai dépassé'); return; }
      try {
        const r = await fetch(`/api/avatar/status?id=${id}`);
        const j = await r.json();
        if (j.status === 'completed' && j.video_url) {
          setVideoUrl(j.video_url);
          setState('ready');
          return;
        }
        if (j.status === 'failed') { setState('error'); setError('Génération échouée'); return; }
        pollRef.current = setTimeout(tick, 3500);
      } catch {
        pollRef.current = setTimeout(tick, 4500);
      }
    };
    tick();
  }

  function reset() {
    setQuestion('');
    setVideoUrl(null);
    setVideoId(null);
    setAnswer('');
    setSources([]);
    setError('');
    setState('idle');
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-[200px] z-40 group"
          aria-label="GLD Live — vidéo"
        >
          <span className="absolute inset-0 rounded-full bg-fuchsia-500 animate-ping opacity-30" />
          <span className="relative flex items-center gap-2 bg-gradient-to-br from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white pl-4 pr-5 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(217,70,239,.6)]">
            <Video size={18} /> GLD Live
          </span>
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] rounded-2xl shadow-[0_0_50px_rgba(217,70,239,.5)] flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-2)', border: '1px solid #d946ef' }}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between text-white"
            style={{ background: 'linear-gradient(135deg, #d946ef 0%, #ec4899 100%)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <div>
                <div className="font-bold text-sm">GLD Live</div>
                <div className="text-[10px] opacity-90">Avatar vidéo · réponse en 30s</div>
              </div>
            </div>
            <button onClick={() => { setOpen(false); reset(); }} className="hover:opacity-70"><X size={18} /></button>
          </div>

          {/* Zone vidéo */}
          <div className="aspect-[3/4] relative flex items-center justify-center"
            style={{ background: '#FBEAF0' }}>
            {state === 'idle' && (
              <div className="text-center px-6">
                <div className="text-5xl mb-3">🎥</div>
                <p className="text-sm font-bold text-zinc-700">Pose ta question</p>
                <p className="text-xs text-zinc-500 mt-1">L'avatar te répondra en vidéo, dans le ton de GLD.</p>
              </div>
            )}
            {(state === 'asking' || state === 'rendering') && (
              <div className="text-center px-6">
                <Loader2 size={32} className="text-fuchsia-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-zinc-700">
                  {state === 'asking' ? 'Préparation de la réponse…' : 'L\'avatar prend la parole…'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">~30 secondes en moyenne</p>
              </div>
            )}
            {state === 'ready' && videoUrl && (
              <video src={videoUrl} controls autoPlay className="w-full h-full object-cover" />
            )}
            {state === 'error' && (
              <div className="text-center px-6">
                <div className="text-3xl mb-2">😔</div>
                <p className="text-sm font-bold text-red-600">Une erreur est survenue</p>
                <p className="text-xs text-zinc-500 mt-1">{error}</p>
              </div>
            )}
          </div>

          {/* Transcript + sources si vidéo prête */}
          {state === 'ready' && answer && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--fg-muted)' }}>
                {answer}
              </p>
              {sources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {sources.slice(0, 3).map((s, i) => (
                    <span key={i} title={s.source || ''}
                      className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
                      style={{ background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                      <BookOpen size={9} />
                      {s.title.length > 24 ? s.title.slice(0, 24) + '…' : s.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); ask(); }}
            className="p-3 flex gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={state === 'ready' ? 'Pose une autre question…' : 'Pose ta question…'}
              disabled={state === 'asking' || state === 'rendering'}
              className="flex-1 rounded-full px-4 py-2 text-sm outline-none disabled:opacity-50"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
            <button type="submit" disabled={!question.trim() || state === 'asking' || state === 'rendering'}
              className="disabled:opacity-50 text-white rounded-full p-2"
              style={{ background: '#d946ef' }}
              aria-label="envoyer">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
