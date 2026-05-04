import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/admin/backup?scope=full|content|users|orders
 * Renvoie un JSON exportable de la DB.
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope = req.nextUrl.searchParams.get('scope') || 'full';

  try {
    const out: any = {
      generatedAt: new Date().toISOString(),
      scope,
      version: 1
    };

    if (scope === 'full' || scope === 'content') {
      out.pages = await prisma.page.findMany().catch(() => []);
      out.articles = await prisma.article.findMany().catch(() => []);
      out.banners = await prisma.banner.findMany().catch(() => []);
      out.menuItems = await prisma.menuItem.findMany().catch(() => []);
      out.sections = await prisma.section.findMany().catch(() => []);
      out.events = await prisma.event.findMany().catch(() => []);
      out.posters = await prisma.poster.findMany().catch(() => []);
      out.youtubeVideos = await prisma.youtubeVideo.findMany().catch(() => []);
      out.partners = await prisma.partner.findMany().catch(() => []);
      out.products = await prisma.product.findMany({ include: { productVariants: true } }).catch(() => []);
      out.knowledgeDocs = await prisma.knowledgeDoc.findMany().catch(() => []);
      out.photos = await prisma.photo.findMany({ select: { id: true, storageKey: true, thumbnailKey: true, caption: true, authorName: true, locale: true, status: true, latitude: true, longitude: true, city: true, country: true, placeName: true, createdAt: true } }).catch(() => []);
    }

    if (scope === 'full' || scope === 'users') {
      out.users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } }).catch(() => []);
      out.subscribers = await prisma.newsletterSubscriber.findMany().catch(() => []);
      out.newsletterCampaigns = await prisma.newsletterCampaign.findMany().catch(() => []);
    }

    if (scope === 'full' || scope === 'orders') {
      out.orders = await prisma.order.findMany({ include: { items: true } }).catch(() => []);
    }

    if (scope === 'full') {
      out.settings = await prisma.setting.findMany().catch(() => []);
    }

    // Compteurs
    const counts: Record<string, number> = {};
    for (const k of Object.keys(out)) {
      if (Array.isArray(out[k])) counts[k] = out[k].length;
    }
    out._counts = counts;

    return new NextResponse(JSON.stringify(out, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="gld-backup-${scope}-${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
