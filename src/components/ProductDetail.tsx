'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Check, Plus, Minus } from 'lucide-react';
import { addToCart, formatPrice } from '@/lib/cart';

type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  currency: string;
  images: string[];
  stock: number | null;
  category: string | null;
  variants: Record<string, string[]> | null;
};

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [variantValues, setVariantValues] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);

  const variantsObj = (product.variants && typeof product.variants === 'object') ? product.variants : null;

  function handleAdd() {
    if (variantsObj) {
      const missing = Object.keys(variantsObj).filter((k) => !variantValues[k]);
      if (missing.length > 0) {
        alert(`Choisis : ${missing.join(', ')}`);
        return;
      }
    }
    addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.images?.[0],
      priceCents: product.priceCents,
      quantity: qty,
      variant: Object.keys(variantValues).length > 0 ? variantValues : undefined
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function buyNow() {
    handleAdd();
    setTimeout(() => router.push('/panier'), 200);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-10">
      {/* IMAGES */}
      <div>
        <div className="aspect-square bg-zinc-900 rounded-2xl overflow-hidden mb-3 relative">
          {product.images?.[activeImage] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[activeImage]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">Aucune image</div>
          )}
        </div>
        {product.images?.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 ${i === activeImage ? 'border-brand-pink' : 'border-transparent'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INFOS */}
      <div className="space-y-5">
        {product.category && (
          <span className="inline-block bg-brand-pink/20 text-brand-pink text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            {product.category}
          </span>
        )}
        <h1 className="text-3xl md:text-4xl font-display font-black text-white">{product.title}</h1>
        <div className="text-3xl font-bold text-brand-pink">
          {formatPrice(product.priceCents, product.currency)}
        </div>
        {product.description && (
          <p className="text-white/80 whitespace-pre-line">{product.description}</p>
        )}

        {/* VARIANTS */}
        {variantsObj && Object.entries(variantsObj).map(([key, options]) => (
          <div key={key}>
            <p className="text-sm font-bold text-white/70 uppercase tracking-wider mb-2">{key}</p>
            <div className="flex flex-wrap gap-2">
              {(options as string[]).map((opt) => {
                const sel = variantValues[key] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setVariantValues({ ...variantValues, [key]: opt })}
                    className={`px-4 py-2 rounded-full border transition ${sel ? 'bg-brand-pink border-brand-pink text-white' : 'border-white/20 text-white/80 hover:border-white/40'}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* QUANTITY */}
        <div className="flex items-center gap-3">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <Minus size={16} />
          </button>
          <span className="w-12 text-center font-bold text-lg">{qty}</span>
          <button onClick={() => setQty(Math.min(99, qty + 1))} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <Plus size={16} />
          </button>
          {product.stock !== null && product.stock !== undefined && (
            <span className="text-sm text-white/60 ml-3">Stock : {product.stock}</span>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold disabled:opacity-50 transition"
          >
            {added ? <><Check size={18} className="text-green-400" /> Ajouté !</> : <><ShoppingCart size={18} /> Ajouter au panier</>}
          </button>
          <button
            onClick={buyNow}
            disabled={product.stock === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand-pink to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold disabled:opacity-50 transition"
          >
            Acheter maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
