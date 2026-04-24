'use client';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Instagram, Facebook, Youtube, Twitter } from 'lucide-react';

export function Footer() {
  const [hashtag, setHashtag] = useState('#GodLovesDiversity');
  useEffect(() => {
    fetch('/api/branding').then((r) => r.json()).then((j) => {
      if (j.hashtag) setHashtag(j.hashtag);
    });
  }, []);

  return (
    <footer className="border-t border-white/10 mt-20 py-8" style={{ background: '#050208' }}>
      <div className="container-wide flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest text-white/60">Suivez-nous</span>
          <div className="flex items-center gap-3 text-white/70">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition"><Instagram size={18} /></a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition"><Facebook size={18} /></a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition" title="TikTok">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/>
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition"><Youtube size={18} /></a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition"><Twitter size={18} /></a>
          </div>
        </div>
        <div className="text-brand-pink font-display font-bold tracking-wider text-lg">{hashtag}</div>
        <div className="text-xs text-white/50">
          © {new Date().getFullYear()} GodLovesDiversity.com — Tous droits réservés.
        </div>
      </div>
      <div className="container-wide mt-4 flex justify-center gap-6 text-xs text-white/40">
        <Link href="/mentions-legales" className="hover:text-brand-pink">Mentions légales</Link>
        <Link href="/rgpd" className="hover:text-brand-pink">Confidentialité</Link>
        <Link href="/contact" className="hover:text-brand-pink">Contact</Link>
      </div>
    </footer>
  );
}
