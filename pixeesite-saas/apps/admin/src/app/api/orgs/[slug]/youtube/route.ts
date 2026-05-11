import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractVideoId(input: string): string {
  const s = (input || '').trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  return s;
}

async function fetchYouTubeMetadata(videoId: string, apiKey: string | null) {
  if (!apiKey) return null;
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`);
    const j: any = await r.json();
    const sn = j?.items?.[0]?.snippet;
    if (!sn) return null;
    return {
      title: sn.title,
      description: sn.description,
      thumbnail: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url,
      channel: sn.channelTitle,
      publishedAt: sn.publishedAt ? new Date(sn.publishedAt) : null,
      category: sn.tags?.[0] || null,
    };
  } catch { return null; }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).youtubeVideo?.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 200 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const raw = b.url || b.videoId;
  if (!raw) return NextResponse.json({ error: 'url or videoId required' }, { status: 400 });
  const videoId = extractVideoId(raw);
  if (!/^[\w-]{11}$/.test(videoId)) return NextResponse.json({ error: 'invalid YouTube id' }, { status: 400 });

  // Try metadata via YouTube Data API key (org secret)
  const orgId = auth.membership.org.id;
  const apiKey = await getOrgSecret(orgId, 'YOUTUBE_API_KEY');
  const meta = await fetchYouTubeMetadata(videoId, apiKey);

  const db = await getTenantPrisma(slug);
  const item = await (db as any).youtubeVideo.upsert({
    where: { videoId },
    create: {
      videoId,
      title: b.title || meta?.title || 'Vidéo YouTube',
      description: b.description || meta?.description || null,
      thumbnail: b.thumbnail || meta?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channel: b.channel || meta?.channel || null,
      publishedAt: meta?.publishedAt || null,
      category: b.category || meta?.category || null,
      featured: !!b.featured,
      position: Number(b.position) || 0,
    },
    update: {
      title: b.title || meta?.title || undefined,
      description: b.description || meta?.description || undefined,
      thumbnail: b.thumbnail || meta?.thumbnail || undefined,
      channel: b.channel || meta?.channel || undefined,
    },
  });
  return NextResponse.json({ ok: true, item, hadApiKey: !!apiKey });
}
