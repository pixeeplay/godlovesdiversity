'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Youtube } from 'lucide-react';

type Video = {
  id: string;
  videoId: string;
  title: string;
  description: string | null;
};

export function YoutubeCarousel({ videos }: { videos: Video[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate (sauf si une vidéo est en lecture)
  useEffect(() => {
    if (paused || playing || videos.length <= 1) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % videos.length), 9000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, playing, videos.length]);

  if (!videos.length) return null;
  const cur = videos[index];

  return (
    <section className="container-wide py-16"
             onMouseEnter={() => setPaused(true)}
             onMouseLeave={() => setPaused(false)}>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-2 flex items-center gap-2">
            <Youtube size={14} /> Vidéos
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold neon-title">
            Le mouvement en images
          </h2>
        </div>
        <div className="hidden md:flex gap-2">
          <button onClick={() => { setIndex((i) => (i - 1 + videos.length) % videos.length); setPlaying(false); }}
            className="btn-ghost p-3"><ChevronLeft size={18} /></button>
          <button onClick={() => { setIndex((i) => (i + 1) % videos.length); setPlaying(false); }}
            className="btn-ghost p-3"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Player principal */}
        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${cur.videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={cur.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <button onClick={() => setPlaying(true)} className="relative w-full h-full group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${cur.videoId}/maxresdefault.jpg`}
                alt={cur.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Si maxresdefault n'existe pas (vidéo trop ancienne ou pas en HD), fallback sur hqdefault qui existe toujours
                  const img = e.currentTarget;
                  if (img.src.includes('maxresdefault')) {
                    img.src = `https://i.ytimg.com/vi/${cur.videoId}/hqdefault.jpg`;
                  } else if (img.src.includes('hqdefault')) {
                    img.src = `https://i.ytimg.com/vi/${cur.videoId}/mqdefault.jpg`;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/70 group-hover:from-black/30 group-hover:via-black/40 group-hover:to-black/80 transition" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-brand-pink/95 group-hover:scale-110 transition flex items-center justify-center shadow-[0_0_60px_rgba(255,43,177,.8)]">
                  <Play size={36} fill="white" className="text-white ml-1" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/70 to-transparent text-left">
                <h3 className="font-display text-xl md:text-2xl font-bold text-white drop-shadow-lg">{cur.title}</h3>
                {cur.description && <p className="text-sm text-white/85 mt-1 line-clamp-2 drop-shadow-md">{cur.description}</p>}
              </div>
            </button>
          )}
        </div>

        {/* Playlist vertical */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto lg:pr-2 lg:-mr-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => { setIndex(i); setPlaying(false); }}
              className={`w-full flex gap-3 p-2 rounded-lg text-left transition
                ${i === index ? 'bg-brand-pink/15 border border-brand-pink/30' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}
            >
              <div className="relative shrink-0 w-24 aspect-video rounded overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                {i === index && (
                  <div className="absolute inset-0 bg-brand-pink/20 flex items-center justify-center">
                    <Play size={14} fill="white" className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium line-clamp-2">{v.title}</div>
                {v.description && <div className="text-xs text-white/50 line-clamp-1 mt-1">{v.description}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {videos.map((_, i) => (
          <button key={i} onClick={() => { setIndex(i); setPlaying(false); }}
            className={`transition-all rounded-full ${i === index ? 'w-6 h-1.5 bg-brand-pink' : 'w-1.5 h-1.5 bg-white/20'}`} />
        ))}
      </div>
    </section>
  );
}
