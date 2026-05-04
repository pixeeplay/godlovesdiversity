'use client';
import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';

/**
 * Bouton ❤️ pour ajouter/retirer un produit de la wishlist.
 * Utilise localStorage si pas connecté (fallback).
 */
export function WishlistButton({ productId, size = 18 }: { productId: string; size?: number }) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Tente de charger depuis l'API (authed)
    fetch('/api/wishlist').then(r => r.json()).then(j => {
      if (j.anonymous) {
        setAuthed(false);
        // Lecture localStorage
        const local = JSON.parse(localStorage.getItem('gld_wishlist') || '[]');
        setActive(local.includes(productId));
      } else {
        setAuthed(true);
        setActive((j.items || []).some((it: any) => it.productId === productId));
      }
    }).catch(() => {
      setAuthed(false);
      const local = JSON.parse(localStorage.getItem('gld_wishlist') || '[]');
      setActive(local.includes(productId));
    });
  }, [productId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      if (authed === false) {
        const local = JSON.parse(localStorage.getItem('gld_wishlist') || '[]');
        const next = active ? local.filter((id: string) => id !== productId) : [...local, productId];
        localStorage.setItem('gld_wishlist', JSON.stringify(next));
        setActive(!active);
      } else {
        const r = active
          ? await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' })
          : await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
        if (r.ok) setActive(!active);
      }
    } finally { setBusy(false); }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`relative rounded-full p-2 transition ${active ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 backdrop-blur'}`}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-label="favori"
    >
      {busy ? <Loader2 size={size} className="animate-spin" /> : <Heart size={size} fill={active ? 'currentColor' : 'none'} />}
    </button>
  );
}
