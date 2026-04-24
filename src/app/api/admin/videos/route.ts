import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Extrait l'ID vidéo depuis une URL YouTube complète ou un ID pur
function extractVideoId(input: string): string {
  const s = input.trim();
  // Pattern watch?v=ID ou /ID direct ou youtu.be/ID ou /embed/ID
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  return s;
}

export async function GET() {
  const videos = await prisma.youtubeVideo.findMany({ orderBy: { order: 'asc' } });
  return NextResponse.json({ videos });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.videoId && !body.url) return NextResponse.json({ error: 'videoId or url required' }, { status: 400 });
  const videoId = extractVideoId(body.videoId || body.url);
  const last = await prisma.youtubeVideo.findFirst({ orderBy: { order: 'desc' } });
  const v = await prisma.youtubeVideo.create({
    data: {
      videoId,
      title: body.title || 'Vidéo sans titre',
      description: body.description || null,
      order: body.order ?? ((last?.order || 0) + 1),
      published: body.published !== false
    }
  });
  return NextResponse.json({ ok: true, video: v });
}
