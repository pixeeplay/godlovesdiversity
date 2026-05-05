'use client';
import { useState } from 'react';
import { Share2, Download, Sparkles, Copy, Check } from 'lucide-react';

const TOPICS = [
  { id: 'testimony', label: '🎤 Témoignage',  example: 'Je suis croyant·e ET LGBT. Dieu m\'aime tel·le que je suis.' },
  { id: 'verse',     label: '✝️ Verset',       example: '« Tu m\'as tissé dans le sein de ma mère. » (Ps 139:13)' },
  { id: 'venue',     label: '🏳️‍🌈 Lieu safe',   example: 'Le Refuge — un lieu inclusif que j\'aime.' },
  { id: 'event',     label: '📅 Événement',   example: 'Marche des fiertés Paris — on s\'y retrouve !' },
  { id: 'pride',     label: '🌈 Pride',        example: 'Fierté · Foi · Amour. C\'est mon identité.' }
];

export function ShareCardClient() {
  const [topic, setTopic] = useState('testimony');
  const [text, setText] = useState(TOPICS[0].example);
  const [author, setAuthor] = useState('');
  const [country, setCountry] = useState('FR');
  const [copied, setCopied] = useState(false);

  const url = `/api/share-card/${topic}?text=${encodeURIComponent(text)}&author=${encodeURIComponent(author)}&country=${encodeURIComponent(country)}`;
  const fullUrl = typeof window !== 'undefined' ? window.location.origin + url : url;

  async function downloadAsPng() {
    try {
      const r = await fetch(url);
      const svg = await r.text();
      // Convert SVG to PNG via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080; canvas.height = 1080;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `gld-${topic}.png`;
          a.click();
        }, 'image/png');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } catch (e: any) {
      alert('Téléchargement impossible : ' + e.message);
    }
  }

  async function shareNative() {
    if (!navigator.share) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    try {
      await navigator.share({
        title: 'God Loves Diversity',
        text: text,
        url: fullUrl
      });
    } catch {}
  }

  return (
    <main className="container-wide py-12 max-w-4xl">
      <header className="mb-6 text-center">
        <div className="inline-block bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3">
          <Share2 size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Crée ta carte à partager</h1>
        <p className="text-zinc-400 text-sm">Image personnalisée prête pour Instagram, TikTok, X, WhatsApp, Telegram…</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Preview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="aspect-square w-full max-w-md mx-auto rounded-xl overflow-hidden border border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Aperçu de ta carte" className="w-full h-full" />
          </div>
          <div className="flex gap-2 mt-3 justify-center flex-wrap">
            <button onClick={shareNative} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              {copied ? <><Check size={14} /> Lien copié !</> : <><Share2 size={14} /> Partager</>}
            </button>
            <button onClick={downloadAsPng} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              <Download size={14} /> Télécharger PNG
            </button>
            <a href={url} download={`gld-${topic}.svg`} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              <Download size={14} /> SVG
            </a>
          </div>
        </div>

        {/* Form */}
        <aside className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map(t => (
                <button key={t.id} onClick={() => { setTopic(t.id); setText(t.example); }} className={`text-xs px-2.5 py-1.5 rounded-full transition ${topic === t.id ? 'bg-fuchsia-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Texte ({text.length}/220)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 220))} rows={5} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Auteur (optionnel)</label>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} placeholder="Ton prénom" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Pays (drapeau)</label>
              <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="FR" maxLength={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono uppercase" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <Sparkles size={12} className="inline mr-1 text-fuchsia-400" />
            Clic <strong>Partager</strong> ouvre le menu natif iOS/Android. Sur desktop, le lien est copié dans le presse-papiers.
            Le format <strong>1080×1080</strong> est parfait pour Instagram/TikTok.
          </p>
        </aside>
      </div>
    </main>
  );
}
