import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { generateAiImage } from '@/lib/ai-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/orgs/[slug]/media/search
 * body: { query: string, source: 'unsplash'|'pexels'|'pixabay'|'pexels-video'|'pixabay-video'|'giphy'|'youtube'|'all-photos'|'all-videos'|'ai' }
 *
 * Returns: { results: MediaResult[], errors?: string[] }
 * Fallback gracieux si une clé est absente — on ignore juste le provider.
 *
 * MediaResult = {
 *   id: string,
 *   type: 'photo' | 'video' | 'gif' | 'youtube',
 *   url: string,          // URL plein format pour insertion
 *   thumb: string,        // URL miniature pour la grille
 *   alt?: string,
 *   width?: number, height?: number,
 *   author?: string,      // crédit
 *   authorUrl?: string,
 *   sourceUrl?: string,   // URL d'origine pour licence
 *   source: 'unsplash'|'pexels'|'pixabay'|'giphy'|'youtube'|'ai',
 * }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const query = (body.query as string || '').trim();
  const source = (body.source as string || 'all-photos').toLowerCase();
  const perPage = Math.min(30, Math.max(6, Number(body.perPage) || 18));

  if (!query) return NextResponse.json({ results: [], errors: ['empty-query'] });

  const orgId = auth.membership.org.id;
  const results: any[] = [];
  const errors: string[] = [];

  const wants = (s: string) => source === s || source === 'all' || source === 'all-photos' && (s === 'unsplash' || s === 'pexels' || s === 'pixabay')
    || source === 'all-videos' && (s === 'pexels-video' || s === 'pixabay-video');

  const tasks: Promise<void>[] = [];

  // ─── Unsplash photos ──────────────────────────────
  if (wants('unsplash')) {
    tasks.push((async () => {
      try {
        const key = await getOrgSecret(orgId, 'UNSPLASH_ACCESS_KEY');
        if (!key) { errors.push('unsplash:no-key'); return; }
        const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
          headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
        });
        if (!r.ok) { errors.push(`unsplash:${r.status}`); return; }
        const j: any = await r.json();
        for (const p of j.results || []) {
          results.push({
            id: `unsplash-${p.id}`,
            type: 'photo',
            url: p.urls?.regular || p.urls?.full,
            thumb: p.urls?.small || p.urls?.thumb,
            alt: p.alt_description || p.description || query,
            width: p.width, height: p.height,
            author: p.user?.name,
            authorUrl: p.user?.links?.html,
            sourceUrl: p.links?.html,
            source: 'unsplash',
          });
        }
      } catch (e: any) { errors.push('unsplash:' + (e?.message || 'err')); }
    })());
  }

  // ─── Pexels photos ───────────────────────────────
  if (wants('pexels')) {
    tasks.push((async () => {
      try {
        const key = await getOrgSecret(orgId, 'PEXELS_API_KEY');
        if (!key) { errors.push('pexels:no-key'); return; }
        const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
          headers: { Authorization: key },
        });
        if (!r.ok) { errors.push(`pexels:${r.status}`); return; }
        const j: any = await r.json();
        for (const p of j.photos || []) {
          results.push({
            id: `pexels-${p.id}`,
            type: 'photo',
            url: p.src?.large2x || p.src?.large || p.src?.original,
            thumb: p.src?.medium || p.src?.small,
            alt: p.alt || query,
            width: p.width, height: p.height,
            author: p.photographer,
            authorUrl: p.photographer_url,
            sourceUrl: p.url,
            source: 'pexels',
          });
        }
      } catch (e: any) { errors.push('pexels:' + (e?.message || 'err')); }
    })());
  }

  // ─── Pixabay photos ──────────────────────────────
  if (wants('pixabay')) {
    tasks.push((async () => {
      try {
        const key = await getOrgSecret(orgId, 'PIXABAY_KEY');
        if (!key) { errors.push('pixabay:no-key'); return; }
        const r = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=${perPage}&image_type=photo&safesearch=true`);
        if (!r.ok) { errors.push(`pixabay:${r.status}`); return; }
        const j: any = await r.json();
        for (const p of j.hits || []) {
          results.push({
            id: `pixabay-${p.id}`,
            type: 'photo',
            url: p.largeImageURL || p.webformatURL,
            thumb: p.webformatURL || p.previewURL,
            alt: p.tags || query,
            width: p.imageWidth, height: p.imageHeight,
            author: p.user,
            authorUrl: `https://pixabay.com/users/${p.user}-${p.user_id}/`,
            sourceUrl: p.pageURL,
            source: 'pixabay',
          });
        }
      } catch (e: any) { errors.push('pixabay:' + (e?.message || 'err')); }
    })());
  }

  // ─── Pexels videos ──────────────────────────────
  if (source === 'pexels-video' || source === 'all-videos') {
    tasks.push((async () => {
      try {
        const key = await getOrgSecret(orgId, 'PEXELS_API_KEY');
        if (!key) { errors.push('pexels-video:no-key'); return; }
        const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
          headers: { Authorization: key },
        });
        if (!r.ok) { errors.push(`pexels-video:${r.status}`); return; }
        const j: any = await r.json();
        for (const v of j.videos || []) {
          // Choisir la meilleure URL mp4 ≤ 1080p
          const files: any[] = v.video_files || [];
          const mp4 = files.filter((f) => f.file_type === 'video/mp4').sort((a, b) => (a.height || 0) - (b.height || 0));
          const pick = mp4.find((f) => (f.height || 0) >= 720) || mp4[mp4.length - 1] || mp4[0];
          if (!pick?.link) continue;
          results.push({
            id: `pexels-video-${v.id}`,
            type: 'video',
            url: pick.link,
            thumb: v.image,
            alt: query,
            width: v.width, height: v.height,
            author: v.user?.name,
            authorUrl: v.user?.url,
            sourceUrl: v.url,
            source: 'pexels',
          });
        }
      } catch (e: any) { errors.push('pexels-video:' + (e?.message || 'err')); }
    })());
  }

  // ─── Pixabay videos ─────────────────────────────
  if (source === 'pixabay-video' || source === 'all-videos') {
    tasks.push((async () => {
      try {
        const key = await getOrgSecret(orgId, 'PIXABAY_KEY');
        if (!key) { errors.push('pixabay-video:no-key'); return; }
        const r = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=${perPage}&safesearch=true`);
        if (!r.ok) { errors.push(`pixabay-video:${r.status}`); return; }
        const j: any = await r.json();
        for (const v of j.hits || []) {
          const pick = v.videos?.medium || v.videos?.small || v.videos?.large || v.videos?.tiny;
          if (!pick?.url) continue;
          results.push({
            id: `pixabay-video-${v.id}`,
            type: 'video',
            url: pick.url,
            thumb: v.videos?.tiny?.thumbnail || `https://i.vimeocdn.com/video/${v.picture_id}_640.jpg`,
            alt: v.tags || query,
            width: pick.width, height: pick.height,
            author: v.user,
            authorUrl: `https://pixabay.com/users/${v.user}-${v.user_id}/`,
            sourceUrl: v.pageURL,
            source: 'pixabay',
          });
        }
      } catch (e: any) { errors.push('pixabay-video:' + (e?.message || 'err')); }
    })());
  }

  // ─── Giphy GIFs ─────────────────────────────────
  if (source === 'giphy') {
    tasks.push((async () => {
      try {
        const key = await getOrgSecret(orgId, 'GIPHY_KEY');
        if (!key) { errors.push('giphy:no-key'); return; }
        const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&limit=${perPage}&rating=pg-13`);
        if (!r.ok) { errors.push(`giphy:${r.status}`); return; }
        const j: any = await r.json();
        for (const g of j.data || []) {
          results.push({
            id: `giphy-${g.id}`,
            type: 'gif',
            url: g.images?.original?.url || g.images?.downsized?.url,
            thumb: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url,
            alt: g.title || query,
            width: Number(g.images?.original?.width) || undefined,
            height: Number(g.images?.original?.height) || undefined,
            author: g.username || g.source_tld,
            sourceUrl: g.url,
            source: 'giphy',
          });
        }
      } catch (e: any) { errors.push('giphy:' + (e?.message || 'err')); }
    })());
  }

  // ─── YouTube ────────────────────────────────────
  if (source === 'youtube') {
    tasks.push((async () => {
      try {
        const key = await getOrgSecret(orgId, 'YOUTUBE_API_KEY');
        if (!key) { errors.push('youtube:no-key'); return; }
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${Math.min(15, perPage)}&key=${encodeURIComponent(key)}`);
        if (!r.ok) { errors.push(`youtube:${r.status}`); return; }
        const j: any = await r.json();
        for (const item of j.items || []) {
          const vid = item.id?.videoId;
          if (!vid) continue;
          results.push({
            id: `yt-${vid}`,
            type: 'youtube',
            url: `https://www.youtube.com/embed/${vid}`,
            thumb: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            alt: item.snippet?.title || query,
            author: item.snippet?.channelTitle,
            sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
            source: 'youtube',
          });
        }
      } catch (e: any) { errors.push('youtube:' + (e?.message || 'err')); }
    })());
  }

  // ─── AI generation (Flux / Unsplash fallback) ─────
  if (source === 'ai') {
    tasks.push((async () => {
      try {
        // On génère 4 variantes pour avoir le choix
        const variants = await Promise.all([0, 1, 2, 3].map((seed) =>
          generateAiImage({ orgId, prompt: query, seed, size: 'landscape_16_9' })));
        variants.forEach((v, i) => {
          if (!v.url) return;
          results.push({
            id: `ai-${Date.now()}-${i}`,
            type: 'photo',
            url: v.url,
            thumb: v.url,
            alt: query,
            author: v.source === 'flux' ? 'Flux AI' : 'Unsplash (fallback)',
            source: 'ai',
          });
        });
      } catch (e: any) { errors.push('ai:' + (e?.message || 'err')); }
    })());
  }

  await Promise.all(tasks);

  // Mélanger les résultats si "all"
  if (source.startsWith('all-')) results.sort(() => Math.random() - 0.5);

  return NextResponse.json({ results, errors, query });
}
