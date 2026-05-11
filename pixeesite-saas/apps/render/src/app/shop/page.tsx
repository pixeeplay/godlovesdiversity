import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function ShopIndex() {
  const org = await getCurrentOrg();
  if (!org) notFound();
  const db = await getCurrentTenantDb();
  const products = await db?.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => []) || [];

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 42, margin: '0 0 8px', color: org.primaryColor }}>Boutique</h1>
        <p style={{ opacity: 0.6, marginBottom: 32 }}>Tous nos produits.</p>
        {products.length === 0 ? (
          <p style={{ opacity: 0.5, textAlign: 'center', padding: 48 }}>Aucun produit pour l'instant.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {products.map((p: any) => (
              <Link key={p.id} href={`/shop/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '4/3', background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : '#0a0a0f' }} />
                  <div style={{ padding: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>{p.name}</h3>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, color: org.primaryColor }}>
                      {(p.priceCents / 100).toFixed(2)} {p.currency}
                    </div>
                    {p.inventory > 0 ? (
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>En stock</div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Rupture</div>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
