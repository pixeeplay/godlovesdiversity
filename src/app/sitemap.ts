import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://parislgbt.com';
const LOCALES = ['fr', 'en'] as const;

/**
 * Sitemap dynamique avec hreflang pour Google/Bing.
 * Inclut : pages statiques LGBT, listings WordPress-compat, catégories, tags, régions,
 * photos publiées, produits boutique, articles.
 *
 * URLs reproduites de l'ancien parislgbt.com WordPress pour préserver le SEO.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const items: MetadataRoute.Sitemap = [];

  // Pages statiques LGBT — nouvelles + WordPress-compat
  const staticPaths = [
    '', '/pride', '/soirees', '/lieux', '/carte', '/identites', '/sante', '/assos',
    '/manifeste', '/tech', '/agenda', '/explore', '/galerie', '/forum', '/temoignages',
    '/qui-sommes-nous', '/contact', '/mentions-legales', '/rgpd', '/participer',
    '/newsletter', '/boutique', '/don'
  ];

  for (const path of staticPaths) {
    const url = `${BASE}${path}`;
    items.push({
      url,
      lastModified: now,
      changeFrequency: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, l === 'fr' ? url : `${BASE}/${l}${path}`])
        )
      }
    });
  }

  // Photos publiées
  try {
    const photos = await prisma.photo.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000
    });
    for (const p of photos) {
      items.push({
        url: `${BASE}/photo/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.6
      });
    }
  } catch {}

  // Produits boutique
  try {
    const products = await prisma.product.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true }
    });
    for (const pr of products) {
      items.push({
        url: `${BASE}/boutique/${pr.slug}`,
        lastModified: pr.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7
      });
    }
  } catch {}

  // Articles
  try {
    const articles = await prisma.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      take: 200
    });
    for (const a of articles) {
      items.push({
        url: `${BASE}/news/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.6
      });
    }
  } catch {}

  // ─── Routes WordPress-compat (préservation SEO de parislgbt.com) ────────
  try {
    const categories = await prisma.category.findMany({ select: { slug: true, updated_at: true } });
    for (const c of categories) {
      for (const loc of LOCALES) {
        items.push({
          url: `${BASE}/${loc}/category/${c.slug}`,
          lastModified: c.updated_at,
          changeFrequency: 'daily',
          priority: 0.9
        });
      }
    }
  } catch {}

  try {
    const listings = await prisma.listing.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updated_at: true }
    });
    for (const l of listings) {
      for (const loc of LOCALES) {
        items.push({
          url: `${BASE}/${loc}/listing/${l.slug}`,
          lastModified: l.updated_at,
          changeFrequency: 'weekly',
          priority: 0.8
        });
      }
    }
  } catch {}

  try {
    const tags = await prisma.tag.findMany({ select: { slug: true, updated_at: true } });
    for (const t of tags) {
      for (const loc of LOCALES) {
        items.push({
          url: `${BASE}/${loc}/tag/${t.slug}`,
          lastModified: t.updated_at,
          changeFrequency: 'weekly',
          priority: 0.6
        });
      }
    }
  } catch {}

  try {
    const regions = await prisma.region.findMany({ select: { slug: true, updated_at: true } });
    for (const r of regions) {
      for (const loc of LOCALES) {
        items.push({
          url: `${BASE}/${loc}/region/${r.slug}`,
          lastModified: r.updated_at,
          changeFrequency: 'weekly',
          priority: 0.7
        });
      }
    }
  } catch {}

  return items;
}
