'use client';
import { useState, useRef, useEffect } from 'react';
import { Share2, Download, Sparkles, Check, Upload, ImageIcon, QrCode, Loader2, Wand2, X } from 'lucide-react';

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
  const [composedPng, setComposedPng] = useState<string | null>(null); // PNG composé client-side
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const targetUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gld.pixeeplay.com';

  // URL SVG pour styles classic/ai (sans photo embarquée — évite la limite URL)
  const svgParams = new URLSearchParams({ text, author, country, qr: '1', targetUrl });
  const svgUrl = `/api/share-card/${topic}?${svgParams.toString()}`;

  // ─── PREVIEW LOGIC : compose client-side avec logo+QR overlay ───
  // - photo : photo user en fond + overlay branding
  // - ai : image IA en fond + overlay branding (logo + QR systématiques)
  useEffect(() => {
    if (style === 'photo' && photoUrl) {
      composeBrandedCard(photoUrl);
    } else if (style === 'ai' && aiUrl) {
      composeBrandedCard(aiUrl);
    } else {
      setComposedPng(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, photoUrl, aiUrl, text, author, country]);

  const previewUrl =
    (style === 'photo' || style === 'ai') && composedPng ? composedPng :
    svgUrl;

  // ────────────────────────────────────────────────────────────
  // Composition image (photo OU IA) + texte + logo GLD + QR sur Canvas
  // ────────────────────────────────────────────────────────────
  async function composeBrandedCard(bgImageUrl: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1080;

    // 1. Fond noir (failsafe)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Image de fond (cover) — photo user OU image IA
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = bgImageUrl;
    });

    // Cover-style scale
    const ratio = Math.max(1080 / img.width, 1080 / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;
    const offX = (1080 - drawW) / 2;
    const offY = (1080 - drawH) / 2;
    ctx.drawImage(img, offX, offY, drawW, drawH);

    // 3. Overlay foncé pour lisibilité
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, 1080, 1080);

    // 4. Vignette gradient
    const grad = ctx.createRadialGradient(540, 540, 200, 540, 540, 720);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 5. Drapeau / arc-en-ciel emoji en haut
    ctx.font = 'bold 140px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    const flag = countryToFlag(country);
    ctx.fillText(flag, 540, 220);

    // 6. Texte principal (wrap auto)
    ctx.font = 'bold 58px Georgia, serif';
    ctx.fillStyle = 'white';
    const lines = wrapText(ctx, text, 920);
    const lineHeight = 80;
    const startY = 440;
    lines.slice(0, 6).forEach((line, i) => {
      ctx.fillText(line, 540, startY + i * lineHeight);
    });

    // 7. Auteur (italique)
    if (author) {
      ctx.font = 'italic 36px Georgia, serif';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(`— ${author}`, 540, startY + Math.min(lines.length, 6) * lineHeight + 70);
    }

    // 8. Logo GLD (cœur arc-en-ciel + texte) en bas-gauche
    drawHeartLogo(ctx, 80, 940);
    ctx.shadowBlur = 4;
    ctx.font = '900 22px -apple-system, sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText('GOD LOVES', 195, 980);
    ctx.fillText('DIVERSITY', 195, 1005);

    // 9. QR code en bas-droite — fetch SVG depuis serveur et dessiner
    try {
      const qrSize = 180;
      const qrX = 870;
      const qrY = 870;

      // Fond blanc QR
      ctx.fillStyle = 'white';
      ctx.shadowBlur = 0;
      roundRect(ctx, qrX, qrY, qrSize, qrSize, 12);
      ctx.fill();

      // Récupère le QR SVG via le endpoint dédié (sans photo dans la query → léger)
      const qrSvgUrl = `/api/share-card/qr-only?text=${encodeURIComponent(targetUrl)}&size=${qrSize}`;
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve(); // on ne fail pas si QR pas dispo
        qrImg.src = qrSvgUrl;
      });
      if (qrImg.complete && qrImg.naturalWidth > 0) {
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }

      // Texte sous le QR
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('Scanne-moi', qrX + qrSize / 2, qrY + qrSize + 20);
    } catch {}

    // Convert to data URI
    const dataUrl = canvas.toDataURL('image/png');
    setComposedPng(dataUrl);
  }

  function drawHeartLogo(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    // Gradient rainbow
    const rainbow = ctx.createLinearGradient(0, 0, 100, 0);
    rainbow.addColorStop(0, '#e40303');
    rainbow.addColorStop(0.2, '#ff8c00');
    rainbow.addColorStop(0.4, '#ffed00');
    rainbow.addColorStop(0.6, '#008026');
    rainbow.addColorStop(0.8, '#004dff');
    rainbow.addColorStop(1, '#750787');
    ctx.fillStyle = rainbow;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 30);
    ctx.bezierCurveTo(40, 5, 0, 5, 0, 30);
    ctx.bezierCurveTo(0, 50, 50, 90, 50, 90);
    ctx.bezierCurveTo(50, 90, 100, 50, 100, 30);
    ctx.bezierCurveTo(100, 5, 60, 5, 50, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function countryToFlag(code: string): string {
    if (!/^[A-Z]{2}$/.test(code)) return '🌈';
    return String.fromCodePoint(...code.split('').map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
  }

  // ─── HANDLERS ───
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
    setComposedPng(null);
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
      } else {
        setAiError(j.error || 'Génération IA échouée');
      }
    } catch (e: any) {
      setAiError(e.message);
    }
    setAiLoading(false);
  }

  function handleStyleChange(newStyle: 'classic' | 'photo' | 'ai') {
    setStyle(newStyle);
    if (newStyle === 'photo' && !photoUrl) {
      // demande la photo si pas encore présente
      setTimeout(() => fileRef.current?.click(), 50);
    }
    // Plus d'auto-generate IA — l'utilisateur clique le bouton explicite
  }

  async function downloadAsPng() {
    try {
      let blob: Blob;
      // Photo OU IA : on download la version composée (avec logo/QR overlay)
      if ((style === 'photo' || style === 'ai') && composedPng) {
        const r = await fetch(composedPng);
        blob = await r.blob();
      } else {
        // Classique : download le SVG via canvas
        const r = await fetch(svgUrl);
        const svg = await r.text();
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1080; canvas.height = 1080;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, 1080, 1080);
            canvas.toBlob((b) => {
              if (!b) return resolve();
              triggerDownload(b);
              resolve();
            }, 'image/png');
          };
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        });
        return;
      }
      triggerDownload(blob);
    } catch (e: any) {
      alert('Téléchargement impossible : ' + e.message);
    }
  }

  function triggerDownload(blob: Blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gld-${topic}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareNative() {
    const fullUrl = typeof window !== 'undefined' ? window.location.origin + '/partager' : '';
    if (!navigator.share) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    try {
      await navigator.share({ title: 'parislgbt', text, url: fullUrl });
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

      {/* Canvas caché pour la composition photo */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

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
            ) : style === 'photo' && photoUrl && !composedPng ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-zinc-400" />
              </div>
            ) : style === 'ai' && !aiUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-900/20 to-violet-900/20 p-6 text-center">
                <div>
                  <Wand2 size={36} className="mx-auto text-fuchsia-300 mb-3 opacity-80" />
                  <div className="text-sm text-fuchsia-100 font-bold mb-1">Affiche IA pas encore générée</div>
                  <div className="text-[11px] text-zinc-400 mb-4">Clique le bouton ci-contre →</div>
                </div>
              </div>
            ) : style === 'ai' && aiUrl && !composedPng ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin mx-auto text-zinc-400 mb-2" />
                  <div className="text-xs text-zinc-400">Composition logo + QR…</div>
                </div>
              </div>
            ) : style === 'photo' && !photoUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-900/20 to-teal-900/20 p-6 text-center">
                <div>
                  <ImageIcon size={36} className="mx-auto text-cyan-300 mb-3 opacity-80" />
                  <div className="text-sm text-cyan-100 font-bold mb-1">Aucune photo</div>
                  <div className="text-[11px] text-zinc-400">Choisis une photo dans le panneau →</div>
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
                  onClick={() => handleStyleChange(s.id as any)}
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
                  <div className="flex-1 text-xs text-zinc-300">
                    <div className="font-bold">Photo prête</div>
                    <div className="text-[10px] text-zinc-500">Modifie le texte pour voir le résultat</div>
                  </div>
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
              <p className="text-[10px] text-zinc-500 mt-2">Ta photo apparaîtra en arrière-plan, avec un overlay foncé pour la lisibilité du texte.</p>
            </div>
          )}

          {/* Génération IA (si style=ai) — BOUTON EXPLICITE */}
          {style === 'ai' && (
            <div className="bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 border border-fuchsia-500/30 rounded-lg p-3">
              <label className="text-[10px] uppercase font-bold text-fuchsia-300 mb-2 block flex items-center gap-1">
                <Wand2 size={11} /> Affiche IA
              </label>
              <p className="text-[11px] text-zinc-300 mb-3">
                L'IA Gemini Nano Banana génère une affiche unique en respectant les valeurs GLD : inclusion, foi, amour. <b>Pas de visages identifiables, pas de symboles religieux clivants.</b>
              </p>
              <button
                onClick={generateAiPoster}
                disabled={aiLoading}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400 text-white font-bold text-sm px-3 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {aiLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Génération en cours…</>
                ) : aiUrl ? (
                  <><Sparkles size={16} /> Régénérer une variante</>
                ) : (
                  <><Sparkles size={16} /> Générer mon affiche IA</>
                )}
              </button>
              {aiError && <p className="text-[11px] text-rose-300 mt-2 bg-rose-500/10 border border-rose-500/30 rounded p-2">⚠ {aiError}</p>}
              {aiUrl && !aiError && <p className="text-[10px] text-emerald-300 mt-2">✓ Affiche générée. Tu peux régénérer pour avoir une variante différente.</p>}
              <p className="text-[9px] text-zinc-500 mt-2">Coût : ~2 appels Gemini quotidiens (sur quota partagé).</p>
            </div>
          )}

          {/* Type de carte */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Type de message</label>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button key={t.id} onClick={() => { setTopic(t.id); setText(t.example); setAiUrl(null); }} className={`text-xs px-2.5 py-1.5 rounded-full transition ${topic === t.id ? 'bg-fuchsia-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}>
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

          {/* Info logo + QR */}
          <div className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <QrCode size={12} /> QR code intégré
            </div>
            <p>Un QR code menant à <code className="bg-black/30 px-1 rounded">gld.pixeeplay.com</code> est ajouté en bas à droite de chaque carte.</p>
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
