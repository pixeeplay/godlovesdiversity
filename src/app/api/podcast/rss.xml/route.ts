import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/podcast/rss.xml
 * Flux RSS Podcast 2.0 compatible Spotify, Apple Podcasts, Google Podcasts.
 * Source : VideoTestimony approuvés avec audioUrl/videoUrl.
 *
 * Pour publier :
 * 1. Spotify for Podcasters → ajouter le podcast par RSS → coller https://gld.pixeeplay.com/api/podcast/rss.xml
 * 2. Apple Podcasts Connect → idem
 */
export async function GET() {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';
  let testimonies: any[] = [];
  try {
    testimonies = await prisma.videoTestimony.findMany({
      where: { status: 'approved' as any },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  } catch {}

  const items = testimonies
    .filter((t: any) => t.videoUrl || (t as any).audioUrl)
    .map((t: any) => `
    <item>
      <title>${escape(t.title || `Témoignage de ${t.authorName || 'Anonyme'}`)}</title>
      <description>${escape(t.transcription?.slice(0, 500) || 'Témoignage du mouvement God Loves Diversity')}</description>
      <link>${SITE}/temoignages#${t.id}</link>
      <guid isPermaLink="false">${t.id}</guid>
      <pubDate>${new Date(t.createdAt).toUTCString()}</pubDate>
      <enclosure url="${(t as any).audioUrl || t.videoUrl}" type="audio/mpeg" length="0"/>
      <itunes:author>${escape(t.authorName || 'GLD')}</itunes:author>
      <itunes:duration>00:05:00</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>God Loves Diversity — Témoignages</title>
    <link>${SITE}</link>
    <language>fr-FR</language>
    <copyright>God Loves Diversity</copyright>
    <itunes:author>God Loves Diversity</itunes:author>
    <itunes:summary>Voix LGBT+ et croyantes du monde entier. Témoignages, prières, parcours de réconciliation entre foi et identité.</itunes:summary>
    <itunes:owner>
      <itunes:name>God Loves Diversity</itunes:name>
      <itunes:email>contact@gld.pixeeplay.com</itunes:email>
    </itunes:owner>
    <itunes:image href="${SITE}/icon-512.png"/>
    <itunes:category text="Religion &amp; Spirituality"><itunes:category text="Christianity"/></itunes:category>
    <itunes:category text="Society &amp; Culture"><itunes:category text="Personal Journals"/></itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <description>Voix LGBT+ et croyantes du monde entier — God Loves Diversity podcast.</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600'
    }
  });
}

function escape(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
