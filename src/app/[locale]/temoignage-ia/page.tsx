'use client';
import { useState } from 'react';
import { Video, Sparkles, Loader2 } from 'lucide-react';

export default function P() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Aoede');
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');

  async function generate() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      // Réutilise l'avatar TTS existant (Gemini TTS)
      const r = await fetch('/api/admin/ai/text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'tts', text, voice })
      });
      const j = await r.json();
      if (j.audioUrl) setAudioUrl(j.audioUrl);
      else alert('TTS non disponible — branche d\'abord LiveAvatar dans /admin/ai/avatar');
    } finally { setBusy(false); }
  }

  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-2xl p-3 mb-3"><Video size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">🎬 Témoignage vidéo IA</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">Écris ton histoire — l'IA en fait une narration audio + animation. Tu peux ensuite l'enregistrer en vidéo (capture écran) ou la partager.</p>
      </header>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Écris ton histoire ici…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" maxLength={1500} />
        <div className="text-xs text-zinc-400 text-right">{text.length}/1500</div>
        <select value={voice} onChange={(e) => setVoice(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
          <option value="Aoede">Aoede (féminine douce)</option>
          <option value="Charon">Charon (masculine grave)</option>
          <option value="Puck">Puck (jeune dynamique)</option>
          <option value="Fenrir">Fenrir (jeune intime)</option>
          <option value="Kore">Kore (féminine claire)</option>
        </select>
        <button onClick={generate} disabled={busy || !text} className={`w-full bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-full flex items-center justify-center gap-2 ${busy ? 'ai-glow ai-glow-subtle' : ''}`}>
          {busy ? <><Loader2 size={14} className="animate-spin" /><span className="ai-shimmer">L'IA narre…</span></> : <><Sparkles size={14} /> Générer la narration</>}
        </button>
        {audioUrl && (
          <div className="bg-zinc-950 border border-fuchsia-500/30 rounded-lg p-3">
            <audio src={audioUrl} controls className="w-full" />
            <a href={audioUrl} download="temoignage-gld.mp3" className="block text-center text-fuchsia-400 hover:underline text-xs mt-2">⬇ Télécharger MP3</a>
          </div>
        )}
      </div>
      <p className="text-[11px] text-zinc-400 mt-3 text-center">💡 Pour avoir une vraie vidéo : ouvre <strong>QuickTime → Nouvel enregistrement écran</strong>, puis lance ton avatar GLD avec ce texte sur <a href="/admin/ai/avatar" className="text-fuchsia-400 underline">/admin/ai/avatar</a>.</p>
    </main>
  );
}
