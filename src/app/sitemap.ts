import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';
const LOCALES = ['fr', 'en', 'es', 'pt'] as const;

/**
 * Sitemap dynamique avec hreflang pour Google/Bing.
 * Inclut : pages statiques, photos publiées, partenaires, produits, affiches.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const items: MetadataRoute.Sitemap = [];

  // Pages statiques par locale
  const staticPaths = ['', '/galerie', '/affiches', '/argumentaire', '/message',
                       '/a-propos', '/connexions', '/partenaires', '/boutique',
                       '/don', '/participer', '/newsletters'];

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
      where: { status: 'PUBLISHED' },
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

  return items;
}
