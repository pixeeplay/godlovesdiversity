'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Music, Save, Trash2, Play, Pause, Plus } from 'lucide-react';

const THEMES = [
  { v: 'priere',     l: '🙏 Prière' },
  { v: 'meditation', l: '🧘 Méditation' },
  { v: 'cathedrale', l: '⛪ Cathédrale (chant grégorien)' },
  { v: 'taize',      l: '✝️ Taizé' },
  { v: 'soufi',      l: '🕌 Soufi' },
  { v: 'mantra',     l: '🕉 Mantra hindou' },
  { v: 'bouddhiste', l: '☸ Bouddhiste tibétain' },
  { v: 'ambient',    l: '🎵 Ambient général' },
  { v: 'custom',     l: '✨ Personnalisé' }
];

type Track = { url: string; title: string };

export function MusicGenerator() {
  const [theme, setTheme] = useState('priere');
  const [customPrompt, setCustomPrompt] = useState('');
  const [duration, setDuration] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState('');
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((j) => {
      if (j['audio.tracks']) {
        try { setTracks(JSON.parse(j['audio.tracks'])); } catch {}
      }
    }).catch(() => {});
  }, []);

  async function generate() {
    setGenerating(true); setError('');
    try {
      const r = await fetch('/api/admin/ai/generate-music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, prompt: customPrompt || undefined, durationSec: duration })
      });
      const j = await r.json();
      if (j.error) { setError(j.error); }
      else if (j.url) {
        const themeLabel = THEMES.find((t) => t.v === theme)?.l.replace(/^[^\s]+\s/, '') || theme;
        const newTrack = { url: j.url, title: themeLabel };
        const next = [...tracks, newTrack];
        setTracks(next);
        await persist(next);
      }
    } catch (e: any) { setError(e.message); }
    setGenerating(false);
  }

  async function remove(idx: number) {
    const next = tracks.filter((_, i) => i !== idx);
    setTracks(next);
    await persist(next);
  }

  async function persist(list: Track[]) {
    await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'audio.tracks': JSON.stringify(list) })
    });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-bold mb-2 flex items-center gap-2"><Music size={18} className="text-brand-pink" /> Générer une musique d'ambiance</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Crée une nappe sonore via ElevenLabs Music. La piste générée s'ajoute au lecteur ambient en bas-gauche du site.
          Le lecteur reste off par défaut côté visiteur — c'est l'utilisateur qui l'active.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Thème</label>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    value={theme} onChange={(e) => setTheme(e.target.value)}>
              {THEMES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Durée</label>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={30}>30 s</option>
              <option value={60}>1 min</option>
              <option value={90}>1 min 30</option>
              <option value={120}>2 min</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={generating}
                    className="w-full bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
              {generating ? <><Loader2 size={14} className="animate-spin" /> Génération…</> : <><Sparkles size={14} /> Générer</>}
            </button>
          </div>
        </div>

        {theme === 'custom' && (
          <textarea className="w-full mt-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" rows={2}
                    placeholder="Décris l'ambiance : ex 'Soft ambient piano, peaceful cathedral, no lyrics, healing'"
                    value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
        )}
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        {savedAt && <p className="text-emerald-400 text-xs mt-3">✓ Bibliothèque sauvegardée</p>}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-bold mb-3">Bibliothèque ({tracks.length})</h3>
        {tracks.length === 0 ? (
          <p className="text-zinc-500 text-sm italic">Aucun morceau. Génère ta première ambiance ci-dessus.</p>
        ) : (
          <div className="space-y-2">
            {tracks.map((t, i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                <button onClick={() => setPlayingIdx(playingIdx === i ? null : i)}
                        className="w-9 h-9 rounded-full bg-brand-pink hover:bg-pink-600 text-white flex items-center justify-center">
                  {playingIdx === i ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{t.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{t.url}</p>
                </div>
                {playingIdx === i && <audio src={t.url} autoPlay onEnded={() => setPlayingIdx(null)} className="hidden" />}
                <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
