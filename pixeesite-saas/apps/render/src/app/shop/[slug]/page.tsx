import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getCurrentOrg();
  if (!org) notFound();
  const db = await getCurrentTenantDb();
  const product = await db?.product.findUnique({ where: { slug } }).catch(() => null);
  if (!product) notFound();

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <Link href="/shop" style={{ fontSize: 13, color: org.primaryColor, textDecoration: 'none', gridColumn: '1/-1' }}>← Retour à la boutique</Link>
        <div>
          <div style={{ aspectRatio: '1/1', background: product.images?.[0] ? `url(${product.images[0]}) center/cover` : '#0a0a0f', borderRadius: 12 }} />
          {product.images?.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {product.images.slice(1, 5).map((img: string, i: number) => (
                <div key={i} style={{ width: 60, height: 60, background: `url(${img}) center/cover`, borderRadius: 6 }} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: 32, margin: '0 0 12px' }}>{product.name}</h1>
          <div style={{ fontSize: 28, fontWeight: 700, color: org.primaryColor, marginBottom: 16 }}>
            {(product.priceCents / 100).toFixed(2)} {product.currency}
          </div>
          {product.description && (
            <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.85, marginBottom: 24 }}>{product.description}</p>
          )}
          <button style={{ background: org.primaryColor, color: 'white', border: 0, padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            Ajouter au panier
          </button>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 12 }}>
            {product.inventory > 0 ? `${product.inventory} en stock` : 'Rupture de stock'}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getCurrentTenantDb();
  const p = await db?.product.findUnique({ where: { slug } }).catch(() => null);
  if (!p) return { title: 'Produit introuvable' };
  return { title: p.name, description: p.description, openGraph: { images: p.images?.[0] ? [p.images[0]] : undefined } };
}
