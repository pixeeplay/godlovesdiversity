'use client';
import { useState } from 'react';
import { Share2, Facebook, Twitter, Mail, MessageCircle, Send, Link2, Check } from 'lucide-react';

type Props = {
  url: string;       // URL absolue de la photo
  title?: string;    // Titre/légende
  hashtags?: string; // ex: 'GodLovesDiversity,Inclusion'
};

/**
 * Boutons de partage social pour une photo.
 * - Web Share API natif si dispo
 * - Sinon fallback : boutons Facebook, X, WhatsApp, Telegram, LinkedIn, Email + copier le lien
 */
export function SharePhoto({ url, title = 'Photo — God Loves Diversity', hashtags = 'GodLovesDiversity,FoiEtDiversite' }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const text = `${title} 🌈 #GodLovesDiversity`;
  const enc = (s: string) => encodeURIComponent(s);

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url });
        return;
      } catch { /* user cancelled */ }
    }
    setOpen(true);
  }

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const targets = [
    { name: 'Facebook',  icon: Facebook,       color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}` },
    { name: 'X',         icon: Twitter,        color: '#000000', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}&hashtags=${enc(hashtags)}` },
    { name: 'WhatsApp',  icon: MessageCircle,  color: '#25D366', href: `https://wa.me/?text=${enc(text + ' ' + url)}` },
    { name: 'Telegram',  icon: Send,           color: '#0088CC', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { name: 'LinkedIn',  icon: Send,           color: '#0A66C2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { name: 'Email',     icon: Mail,           color: '#EF4444', href: `mailto:?subject=${enc(title)}&body=${enc(text + '\n\n' + url)}` }
  ];

  return (
    <div className="relative inline-block">
      <button
        onClick={nativeShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-pink hover:bg-pink-600 text-white text-sm font-bold transition"
        aria-label="Partager"
      >
        <Share2 size={16} /> Partager
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-3 min-w-[280px]">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {targets.map((t) => {
                const Icon = t.icon;
                return (
                  <a
                    key={t.name}
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                    title={t.name}
                  >
                    <Icon size={22} style={{ color: t.color }} />
                    <span className="text-[10px] text-white/70">{t.name}</span>
                  </a>
                );
              })}
            </div>
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/85 text-sm transition"
            >
              {copied ? <><Check size={16} className="text-green-400" /> Lien copié !</> : <><Link2 size={16} /> Copier le lien</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
