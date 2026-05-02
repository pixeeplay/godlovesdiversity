'use client';
import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

/**
 * Génère une vraie miniature de la page 1 d'un PDF côté client.
 * Charge pdf.js depuis CDN à la demande (pas de npm install requis).
 * Fallback gracieux : carte dégradée colorée si le PDF ne peut être lu.
 */
type Props = {
  pdfUrl: string;
  thumbnailUrl?: string | null;  // si déjà généré côté serveur, on l'utilise
  format?: string;
  alt?: string;
  className?: string;
};

let pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR');
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.js';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) return reject(new Error('pdf.js not loaded'));
      lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js';
      resolve(lib);
    };
    script.onerror = () => reject(new Error('CDN load failed'));
    document.head.appendChild(script);
  });
  return pdfjsPromise;
}

export function PosterThumbnail({ pdfUrl, thumbnailUrl, format, alt, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (thumbnailUrl) return; // si on a déjà une thumb serveur, on l'utilise
    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setLoaded(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfUrl, thumbnailUrl]);

  // Si une thumbnail serveur existe, on la prend (plus léger qu'un canvas pdf.js)
  if (thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbnailUrl} alt={alt || ''} className={`w-full h-auto object-cover ${className}`} loading="lazy" />
    );
  }

  if (error) {
    return (
      <div className={`relative w-full aspect-[3/4] flex flex-col items-center justify-center bg-gradient-to-br from-pink-500/40 via-violet-500/30 to-cyan-500/30 rounded-lg overflow-hidden ${className}`}>
        <FileText className="w-1/3 h-1/3 text-white/90" />
        <span className="text-sm text-white/80 mt-3 font-bold">{format || 'PDF'}</span>
        <span className="text-[10px] text-white/50 mt-1">Cliquer pour ouvrir</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <canvas
        ref={canvasRef}
        className={`w-full h-auto rounded transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        aria-label={alt}
      />
      {!loaded && (
        <div className="absolute inset-0 aspect-[3/4] flex items-center justify-center bg-zinc-900/50 rounded animate-pulse">
          <FileText className="w-8 h-8 text-white/30" />
        </div>
      )}
    </div>
  );
}
