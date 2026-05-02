import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/']
      },
      // Bloquer les bots IA scrapers (sauf si l'asso souhaite l'inverse)
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' }
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE
  };
}
