'use client';
import { useEffect, useRef, useState } from 'react';

interface Block {
  id: string;
  position: number;
  width: string;
  height: string;
  type: string;
  data: any;
  effect: string | null;
  effectDelay: number | null;
}

const WIDTH_CLASS: Record<string, string> = {
  '1/4': 'w-full md:w-1/4',
  '1/3': 'w-full md:w-1/3',
  '1/2': 'w-full md:w-1/2',
  '2/3': 'w-full md:w-2/3',
  '3/4': 'w-full md:w-3/4',
  full:  'w-full'
};

export function PageBlocksClient({ blocks }: { blocks: Block[] }) {
  return (
    <div className="container-wide py-8">
      <div className="flex flex-wrap -mx-3">
        {blocks.map((b) => (
          <div key={b.id} className={`${WIDTH_CLASS[b.width] || 'w-full'} px-3 mb-6`}>
            <AnimatedBlock block={b} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedBlock({ block }: { block: Block }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!block.effect);

  useEffect(() => {
    if (!block.effect || visible) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), block.effectDelay || 0);
          obs.disconnect();
        }
      });
    }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [block.effect, block.effectDelay, visible]);

  const style: React.CSSProperties = {
    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
    opacity: visible ? 1 : 0,
    transform:
      !visible && block.effect === 'slide-up' ? 'translateY(40px)' :
      !visible && block.effect === 'slide-left' ? 'translateX(-40px)' :
      !visible && block.effect === 'scale' ? 'scale(0.92)' :
      !visible && block.effect === 'fade' ? 'translateY(0)' :
      'none'
  };

  return (
    <div ref={ref} style={style}>
      <BlockRenderer block={block} />
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const d = block.data || {};

  if (block.type === 'text') {
    return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: d.html || '' }} />;
  }
  if (block.type === 'image' && d.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={d.src} alt={d.alt || ''} className="w-full rounded-2xl" />;
  }
  if (block.type === 'video' && d.src) {
    if (d.src.includes('youtube.com') || d.src.includes('youtu.be')) {
      const id = d.src.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
      return id ? <iframe src={`https://www.youtube.com/embed/${id}`} className="w-full aspect-video rounded-2xl" allowFullScreen /> : null;
    }
    return <video src={d.src} controls className="w-full rounded-2xl" />;
  }
  if (block.type === 'cta') {
    return (
      <div className="text-center my-4">
        <a href={d.href || '#'} className="inline-block bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 text-white font-bold px-6 py-3 rounded-full text-sm shadow-lg shadow-fuchsia-500/30">
          {d.label || 'Cliquer'}
        </a>
      </div>
    );
  }
  if (block.type === 'hero') {
    return (
      <div
        className="relative rounded-3xl overflow-hidden p-8 md:p-12 text-center"
        style={d.bgImage ? { background: `url(${d.bgImage}) center/cover` } : { background: 'linear-gradient(135deg, #d946ef 0%, #8b5cf6 50%, #06b6d4 100%)' }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative">
          <h1 className="font-display font-bold text-3xl md:text-5xl text-white mb-3">{d.title}</h1>
          {d.subtitle && <p className="text-white/90 text-lg max-w-2xl mx-auto mb-6">{d.subtitle}</p>}
          {d.cta?.label && <a href={d.cta?.href || '#'} className="inline-block bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-6 py-3 rounded-full">{d.cta.label}</a>}
        </div>
      </div>
    );
  }
  if (block.type === 'columns' && Array.isArray(d.columns)) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(d.columns.length, 4)} gap-6`}>
        {d.columns.map((c: any, i: number) => (
          <div key={i} className="prose prose-invert" dangerouslySetInnerHTML={{ __html: c.html || '' }} />
        ))}
      </div>
    );
  }
  if (block.type === 'embed') {
    return <div dangerouslySetInnerHTML={{ __html: d.html || '' }} />;
  }
  if (block.type === 'spacer') {
    return <div style={{ height: d.height || 60 }} />;
  }
  return null;
}
