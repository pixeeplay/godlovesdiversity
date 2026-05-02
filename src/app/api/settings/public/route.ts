import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint public pour récupérer des settings non sensibles depuis le client.
 * Whitelist explicite des clés autorisées (sécurité : on ne renvoie JAMAIS de clé API ou secret).
 */
const PUBLIC_KEYS = new Set([
  'upload.consentText',
  'upload.consentRights',
  'upload.consentPromo',
  'site.title',
  'site.tagline',
  'campaign.hashtag',
  'donate.enabled',
  'donate.helloAssoUrl',
  'audio.tracks',
  'audio.enabled',
  'visuals.heroStyle',
  'visuals.heroAiUrls'
]);

export async function GET(req: NextRequest) {
  const requested = (req.nextUrl.searchParams.get('keys') || '').split(',').map((k) => k.trim()).filter(Boolean);
  const allowed = requested.filter((k) => PUBLIC_KEYS.has(k));
  if (allowed.length === 0) return NextResponse.json({});
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: allowed } } });
    return NextResponse.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch {
    return NextResponse.json({});
  }
}
