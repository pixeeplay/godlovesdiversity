import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: { in: ['site.logoUrl', 'site.title', 'site.tagline', 'campaign.hashtag'] }
      }
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      logoUrl: map['site.logoUrl'] || null,
      title: map['site.title'] || 'God Loves Diversity',
      tagline: map['site.tagline'] || '',
      hashtag: map['campaign.hashtag'] || '#GodLovesDiversity'
    });
  } catch {
    return NextResponse.json({ logoUrl: null, title: 'God Loves Diversity', tagline: '', hashtag: '#GodLovesDiversity' });
  }
}
