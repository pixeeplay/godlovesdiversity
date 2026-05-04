import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export const revalidate = 60; // ISR
export const metadata = { title: 'Boutique — God Loves Diversity' };

function formatPrice(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

export default async function ShopPage() {
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: { published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
    });
  } catch { products = []; }

  return (
    <main className="min-h-screen py-16">
      <div className="container-wide">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingBag className="text-brand-pink" size={36} />
          <h1 className="font-display text-4xl md:text-5xl font-black gradient-text">Boutique</h1>
        </div>
        <p className="text-lg text-white/70 mb-10 max-w-2xl">
          T-shirts, posters, mugs, livres et accessoires aux couleurs de la diversité.
          Chaque achat finance le mouvement.
        </p>

        {products.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <ShoppingBag className="mx-auto text-white/30 mb-4" size={48} />
            <p className="text-white/60">Boutique en cours de préparation. Reviens bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => {
              const cover = p.images?.[0];
              return (
                <Link
                  key={p.id}
                  href={`/boutique/${p.slug}`}
                  className="group bg-white/5 hover:bg-white/10 rounded-2xl overflow-hidden border border-white/10 hover:border-brand-pink/40 transition flex flex-col"
                >
                  <div className="aspect-square bg-zinc-900 relative overflow-hidden">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <ShoppingBag size={48} />
                      </div>
                    )}
                    {p.category && (
                      <div className="absolute top-3 left-3 bg-brand-pink/90 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {p.category}
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-white group-hover:text-brand-pink transition">{p.title}</h3>
                    {p.description && (
                      <p className="text-sm text-white/60 mt-1 line-clamp-2">{p.description}</p>
                    )}
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-brand-pink">{formatPrice(p.priceCents, p.currency)}</span>
                      {p.stock !== null && p.stock !== undefined && p.stock <= 5 && p.stock > 0 && (
                        <span className="text-xs text-amber-300">Plus que {p.stock} !</span>
                      )}
                      {p.stock === 0 && <span className="text-xs text-red-300">Épuisé</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
