import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectScope } from '@/lib/scope';
import { getSiteConfig } from '@/lib/site-configs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const scope = detectScope(host);
  const cfg = getSiteConfig(scope);

  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            `${scope}.site.logoUrl`, `${scope}.site.title`, `${scope}.site.tagline`, `${scope}.campaign.hashtag`,
            'site.logoUrl', 'site.title', 'site.tagline', 'campaign.hashtag'
          ]
        }
      }
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    // Scope-specific settings take priority over global ones
    const get = (key: string, fallback: string) =>
      map[`${scope}.${key}`] ?? map[key] ?? fallback;

    return NextResponse.json({
      scope,
      logoUrl: get('site.logoUrl', ''),
      title: get('site.title', cfg.name),
      tagline: get('site.tagline', cfg.tagline),
      hashtag: get('campaign.hashtag', cfg.hashtag),
      accentColor: cfg.accentColor,
      navLogoLines: cfg.navLogoLines,
      domain: cfg.domain,
    });
  } catch {
    return NextResponse.json({
      scope,
      logoUrl: '',
      title: cfg.name,
      tagline: cfg.tagline,
      hashtag: cfg.hashtag,
      accentColor: cfg.accentColor,
      navLogoLines: cfg.navLogoLines,
      domain: cfg.domain,
    });
  }
}
