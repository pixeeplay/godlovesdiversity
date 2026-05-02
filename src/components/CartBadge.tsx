'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { cartCount } from '@/lib/cart';

export function CartBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(cartCount());
    update();
    window.addEventListener('cart:updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('cart:updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return (
    <Link href="/panier" className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition" aria-label="Panier">
      <ShoppingCart size={18} style={{ color: 'var(--fg)' }} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-brand-pink text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
