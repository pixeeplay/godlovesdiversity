import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const posts = await prisma.scheduledPost.findMany({
    orderBy: { scheduledAt: 'asc' }
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const post = await prisma.scheduledPost.create({
    data: {
      title: body.title,
      content: body.content,
      mediaKeys: body.mediaKeys || [],
      channels: body.channels || [],
      scheduledAt: new Date(body.scheduledAt),
      createdById: (s.user as any).id
    }
  });
  return NextResponse.json({ ok: true, post });
}
