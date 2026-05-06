'use client';
import { useState, useRef } from 'react';
import { Share2, Download, Sparkles, Copy, Check, Upload, ImageIcon, QrCode, Loader2, Wand2, X } from 'lucide-react';

const TOPICS = [
  { id: 'testimony', label: '🎤 Témoignage',  example: 'Je suis croyant·e ET LGBT. Dieu m\'aime tel·le que je suis.' },
  { id: 'verse',     label: '✝️ Verset',       example: '« Tu m\'as tissé dans le sein de ma mère. » (Ps 139:13)' },
  { id: 'venue',     label: '🏳️‍🌈 Lieu safe',   example: 'Le Refuge — un lieu inclusif que j\'aime.' },
  { id: 'event',     label: '📅 Événement',   example: 'Marche des fiertés Paris — on s\'y retrouve !' },
  { id: 'pride',     label: '🌈 Pride',        example: 'Fierté · Foi · Amour. C\'est mon identité.' }
];

const STYLES = [
  { id: 'classic',  label: '🎨 Classique',  desc: 'Cœur néon GLD' },
  { id: 'photo',    label: '📷 Avec photo', desc: 'Ta photo en arrière-plan' },
  { id: 'ai',       label: '✨ IA proposée', desc: 'Affiche IA dans nos valeurs' }
];

export function ShareCardClient() {
  const [topic, setTopic] = useState('testimony');
  const [text, setText] = useState(TOPICS[0].example);
  const [author, setAuthor] = useState('');
  const [country, setCountry] = useState('FR');
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<'classic' | 'photo' | 'ai'>('classic');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [aiUrl, setAiUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // URL de partage avec QR code = lien vers la home
  const targetUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gld.pixeeplay.com';

  // URL d'aperçu : SVG classique OU avec photo OU image IA
  const params = new URLSearchParams({
    text,
    author,
    country,
    qr: '1', // QR code activé
    photo: photoUrl || '',
    targetUrl
  });
  const svgUrl = `/api/share-card/${topic}?${params.toString()}`;
  const previewUrl = style === 'ai' && aiUrl ? aiUrl : svgUrl;
  const fullUrl = typeof window !== 'undefined' ? window.location.origin + svgUrl : svgUrl;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('Photo trop lourde (max 8 Mo)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
      setStyle('photo');
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoUrl(null);
    if (fileRef.current) fileRef.current.value = '';
    if (style === 'photo') setStyle('classic');
  }

  async function generateAiPoster() {
    setAiLoading(true);
    setAiError(null);
    setAiUrl(null);
    try {
      const r = await fetch('/api/share-card/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, text, author, country })
      });
      const j = await r.json();
      if (j.ok && j.imageUrl) {
        setAiUrl(j.imageUrl);
        setStyle('ai');
      } else {
        setAiError(j.error || 'Génération IA échouée');
      }
    } catch (e: any) {
      setAiError(e.message);
    }
    setAiLoading(false);
  }

  async function downloadAsPng() {
    try {
      const downloadUrl = style === 'ai' && aiUrl ? aiUrl : svgUrl;
      const r = await fetch(downloadUrl);
      const blob = await r.blob();
      // Si SVG → convertir en PNG via canvas. Si déjà PNG/JPG, download direct.
      if (blob.type.includes('svg')) {
        const svg = await blob.text();
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1080; canvas.height = 1080;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, 1080, 1080);
          canvas.toBlob((b) => {
            if (!b) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `gld-${topic}-${Date.now()}.png`;
            a.click();
          }, 'image/png');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `gld-${topic}-${Date.now()}.png`;
        a.click();
      }
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
      await navigator.share({ title: 'God Loves Diversity', text, url: fullUrl });
    } catch {}
  }

  return (
    <main className="container-wide py-12 max-w-4xl">
      <header className="mb-6 text-center">
        <div className="inline-block bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3">
          <Share2 size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Crée ta carte à partager</h1>
        <p className="text-zinc-400 text-sm">Image 1080×1080 prête pour Instagram, TikTok, X, WhatsApp, Telegram… avec logo GLD et QR code intégré.</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* APERÇU */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="aspect-square w-full max-w-md mx-auto rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 relative">
            {aiLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-900/30 to-violet-900/30">
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin mx-auto text-fuchsia-300 mb-2" />
                  <div className="text-xs text-fuchsia-200">Création de l'affiche IA…</div>
                  <div className="text-[10px] text-zinc-500 mt-1">~15-30 secondes</div>
                </div>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Aperçu de ta carte" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex gap-2 mt-3 justify-center flex-wrap">
            <button onClick={shareNative} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              {copied ? <><Check size={14} /> Lien copié !</> : <><Share2 size={14} /> Partager</>}
            </button>
            <button onClick={downloadAsPng} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              <Download size={14} /> Télécharger PNG
            </button>
            {style !== 'ai' && (
              <a href={svgUrl} download={`gld-${topic}.svg`} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                <Download size={14} /> SVG
              </a>
            )}
          </div>
        </div>

        {/* FORM */}
        <aside className="space-y-4">
          {/* Style de carte */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 mb-2 block">Style</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStyle(s.id as any);
                    if (s.id === 'photo' && !photoUrl) fileRef.current?.click();
                    if (s.id === 'ai' && !aiUrl) generateAiPoster();
                  }}
                  className={`text-xs p-2 rounded-lg transition text-center ${style === s.id ? 'bg-fuchsia-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  <div>{s.label}</div>
                  <div className="text-[9px] opacity-70 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload photo (si style=photo) */}
          {style === 'photo' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <label className="text-[10px] uppercase font-bold text-zinc-400 mb-2 block flex items-center gap-1">
                <ImageIcon size={11} /> Ta photo
              </label>
              {photoUrl ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="" className="w-16 h-16 rounded object-cover" />
                  <button onClick={clearPhoto} className="text-xs text-rose-300 hover:underline flex items-center gap-1">
                    <X size={12} /> Retirer
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="w-full bg-zinc-800 hover:bg-zinc-700 border-2 border-dashed border-zinc-700 rounded p-4 text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Upload size={14} /> Choisir une photo (max 8 Mo)
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              <p className="text-[10px] text-zinc-500 mt-2">Ta photo apparaîtra en arrière-plan, avec un overlay foncé pour la lisibilité du texte. Conseil : photo claire ou lumineuse.</p>
            </div>
          )}

          {/* Génération IA (si style=ai) */}
          {style === 'ai' && (
            <div className="bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 border border-fuchsia-500/30 rounded-lg p-3">
              <label className="text-[10px] uppercase font-bold text-fuchsia-300 mb-2 block flex items-center gap-1">
                <Wand2 size={11} /> Affiche IA
              </label>
              <p className="text-[11px] text-zinc-300 mb-3">
                L'IA génère une affiche unique respectant les valeurs GLD : inclusion, foi, amour. Pas de visages identifiables, pas de symboles religieux clivants.
              </p>
              <button
                onClick={generateAiPoster}
                disabled={aiLoading}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400 text-white font-bold text-sm px-3 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiUrl ? 'Régénérer une nouvelle affiche' : 'Générer mon affiche'}
              </button>
              {aiError && <p className="text-[11px] text-rose-300 mt-2">⚠ {aiError}</p>}
              {aiUrl && <p className="text-[10px] text-emerald-300 mt-2">✓ Affiche générée. Tu peux régénérer pour avoir une variante différente.</p>}
            </div>
          )}

          {/* Type de carte */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button key={t.id} onClick={() => { setTopic(t.id); setText(t.example); }} className={`text-xs px-2.5 py-1.5 rounded-full transition ${topic === t.id ? 'bg-fuchsia-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Texte */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Texte ({text.length}/220)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 220))} rows={5} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Auteur + Pays */}
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

          {/* QR code info */}
          <div className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <QrCode size={12} /> QR code intégré
            </div>
            <p>Un QR code menant à <code className="bg-black/30 px-1 rounded">gld.pixeeplay.com</code> est ajouté en bas à droite de chaque carte. Toute personne qui scanne arrive sur le site.</p>
            <div className="flex items-center gap-2 text-fuchsia-300 font-bold pt-2 border-t border-zinc-800">
              <Sparkles size={12} /> Logo GLD
            </div>
            <p>Le logo cœur arc-en-ciel GLD est placé en bas à gauche, automatiquement.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
