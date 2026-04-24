import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const pageSlug = searchParams.get('pageSlug') || undefined;
  const locale = searchParams.get('locale') || undefined;
  const sections = await prisma.section.findMany({
    where: { ...(pageSlug && { pageSlug }), ...(locale && { locale }) },
    orderBy: [{ pageSlug: 'asc' }, { order: 'asc' }]
  });
  return NextResponse.json({ sections });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.pageSlug) return NextResponse.json({ error: 'pageSlug required' }, { status: 400 });

  // Auto-place à la fin
  const last = await prisma.section.findFirst({
    where: { pageSlug: body.pageSlug, locale: body.locale || 'fr' },
    orderBy: { order: 'desc' }
  });
  const order = body.order ?? ((last?.order || 0) + 1);

  const section = await prisma.section.create({
    data: {
      pageSlug: body.pageSlug,
      locale: body.locale || 'fr',
      title: body.title || null,
      subtitle: body.subtitle || null,
      body: body.body || null,
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      layout: body.layout || 'text-image',
      accentColor: body.accentColor || null,
      ctaText: body.ctaText || null,
      ctaUrl: body.ctaUrl || null,
      order,
      published: body.published !== false
    }
  });
  return NextResponse.json({ ok: true, section });
}
