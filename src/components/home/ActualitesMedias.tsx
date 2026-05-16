'use client';
import { useState } from 'react';
import { ArrowRight, Mail, Send } from 'lucide-react';

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  publishedAt?: string | null;
};

type Video = {
  id: string;
  videoId: string;
  title: string;
};

/**
 * GLD V1 — Zone 4 : Actualités / Médias
 * Layout modulaire : 1 vidéo YouTube + 2 news + 1 encart newsletter inline.
 */
export function ActualitesMedias({
  articles,
  videos,
  locale
}: {
  articles: Article[];
  videos: Video[];
  locale: string;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (r.ok) { setSubscribed(true); setEmail(''); }
    } catch {}
    setBusy(false);
  }

  const video = videos[0];
  const news = articles.slice(0, 2);
  const localePrefix = locale !== 'fr' ? `/${locale}` : '';

  if (!video && news.length === 0) return null;

  return (
    <section className="py-24 md:py-32 border-t border-[color:var(--border)]" style={{ background: 'var(--bg)' }}>
      <div className="container-wide">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-3">Actualités & médias</p>
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">
              Le mouvement, en images et en mots
            </h2>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Vidéo YouTube — colonne large */}
          {video && (
            <div className="lg:col-span-2 rounded-2xl overflow-hidden bg-black border border-white/5">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${video.videoId}`}
                  title={video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display font-bold text-lg">{video.title}</h3>
              </div>
            </div>
          )}

          {/* Colonne droite : 2 news empilées + newsletter */}
          <div className="flex flex-col gap-6">
            {news.map((a) => (
              <a
                key={a.id}
                href={`${localePrefix}/blog/${a.slug}`}
                className="rounded-2xl bg-white/[0.03] border border-white/5 hover:border-brand-pink/40 transition p-5 group"
              >
                {a.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.coverImage}
                    alt={a.title}
                    loading="lazy"
                    className="w-full aspect-video object-cover rounded-lg mb-4"
                  />
                )}
                <h3 className="font-display font-bold text-base leading-tight group-hover:text-brand-pink transition">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-sm text-white/60 mt-2 line-clamp-2">{a.excerpt}</p>
                )}
              </a>
            ))}

            {/* Encart newsletter inline */}
            <div className="rounded-2xl border border-brand-pink/30 p-6 bg-gradient-to-br from-brand-pink/10 to-violet-500/10">
              <div className="flex items-center gap-2 text-brand-pink mb-2">
                <Mail size={16} />
                <span className="text-xs uppercase tracking-widest font-bold">Newsletter</span>
              </div>
              <h3 className="font-display font-bold text-lg leading-tight mb-3">
                Reste connecté au mouvement
              </h3>
              <p className="text-sm text-white/70 mb-4">
                Une fois par mois, l'essentiel : témoignages, actus, rendez-vous.
              </p>
              {subscribed ? (
                <p className="text-sm text-emerald-400">✓ Vérifie ta boîte mail pour confirmer.</p>
              ) : (
                <form onSubmit={subscribe} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-pink"
                  />
                  <button
                    type="submit"
                    disabled={busy || !email}
                    className="bg-brand-pink hover:bg-pink-600 text-white font-bold rounded-lg px-4 disabled:opacity-50 transition inline-flex items-center gap-1.5 text-sm"
                  >
                    {busy ? '…' : <><Send size={13} /> Je m'inscris</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Lien voir toutes actus */}
        {articles.length > 2 && (
          <div className="mt-10 text-center">
            <a href={`${localePrefix}/blog`} className="gld-cta-secondary">
              Toutes les actualités <ArrowRight size={14} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
