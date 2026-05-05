import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const banners = await prisma.banner.findMany({ orderBy: [{ locale: 'asc' }, { order: 'asc' }] });
  return NextResponse.json({ banners });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const last = await prisma.banner.findFirst({
    where: { locale: body.locale || 'fr' },
    orderBy: { order: 'desc' }
  });
  const banner = await prisma.banner.create({
    data: {
      locale: body.locale || 'fr',
      eyebrow: body.eyebrow || null,
      title: body.title || 'Nouvelle bannière',
      subtitle: body.subtitle || null,
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      cta1Text: body.cta1Text || null,
      cta1Url: body.cta1Url || null,
      cta2Text: body.cta2Text || null,
      cta2Url: body.cta2Url || null,
      accentColor: body.accentColor || '#FF2BB1',
      order: body.order ?? ((last?.order || 0) + 1),
      published: body.published !== false,
      aiPrompt: body.aiPrompt || null,
      presetSlug: body.presetSlug || null,
      activeFrom: body.activeFrom ? new Date(body.activeFrom) : null,
      activeUntil: body.activeUntil ? new Date(body.activeUntil) : null,
      linkedThemeSlug: body.linkedThemeSlug || null
    }
  });
  return NextResponse.json({ ok: true, banner });
}
