import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';

function fmt(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

/**
 * Bandeau défilant de produits boutique sur la home.
 * Auto-scroll CSS marquee avec pause au survol.
 */
export async function ProductsCarousel() {
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: { published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      take: 12
    });
  } catch { return null; }
  if (products.length === 0) return null;

  // Duplique pour boucle infinie sans saccade
  const items = [...products, ...products, ...products];

  return (
    <section className="py-16 overflow-hidden border-t border-white/5">
      <div className="container-wide flex items-end justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-2 flex items-center gap-2">
            <ShoppingBag size={14} /> Boutique
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold neon-title">
            Soutenez le mouvement
          </h2>
        </div>
        <Link href="/boutique" className="hidden md:inline-flex items-center gap-2 text-brand-pink hover:underline font-bold">
          Voir tous les produits <ArrowRight size={16} />
        </Link>
      </div>

      <div className="photo-marquee">
        <div className="photo-marquee-track">
          {items.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href={`/boutique/${p.slug}`}
              className="shrink-0 w-64 group rounded-2xl overflow-hidden border border-white/10 hover:border-brand-pink/40 bg-white/5 hover:bg-white/10 transition flex flex-col"
            >
              <div className="aspect-square bg-zinc-900 overflow-hidden relative">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20"><ShoppingBag size={48} /></div>
                )}
                {p.category && (
                  <div className="absolute top-2 left-2 bg-brand-pink/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    {p.category}
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-white text-sm group-hover:text-brand-pink truncate">{p.title}</h3>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-brand-pink">{fmt(p.priceCents, p.currency)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="container-wide flex justify-center md:hidden mt-6">
        <Link href="/boutique" className="inline-flex items-center gap-2 bg-brand-pink hover:bg-pink-600 text-white font-bold px-6 py-2.5 rounded-full">
          Voir la boutique <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
