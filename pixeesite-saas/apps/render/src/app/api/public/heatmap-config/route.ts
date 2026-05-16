import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { platformDb } from '@pixeesite/database';
import { createDecipheriv, createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/public/heatmap-config
 * Renvoie les IDs publics (non sensibles) de heatmap/replay configurés
 * pour l'org courante : MICROSOFT_CLARITY_ID, HOTJAR_ID.
 * Ces IDs sont publics (ils apparaissent dans le HTML) — donc safe à exposer.
 */
function getKey(): Buffer {
  const k = process.env.MASTER_KEY || process.env.NEXTAUTH_SECRET;
  if (!k) throw new Error('no key');
  return createHash('sha256').update(k).digest();
}

function decryptSecret(stored: string): string {
  if (!stored) return '';
  try {
    const [ivB64, tagB64, dataB64] = stored.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

async function getOrgPublicId(orgId: string, key: string): Promise<string | null> {
  const row = await platformDb.orgSecret.findUnique({ where: { orgId_key: { orgId, key } } }).catch(() => null);
  if (row?.active) {
    const v = decryptSecret(row.value);
    if (v) return v;
  }
  // Fallback platform-level
  const pRow = await platformDb.platformSecret.findUnique({ where: { key } }).catch(() => null);
  if (pRow?.active) return decryptSecret(pRow.value) || null;
  if (process.env[key]) return process.env[key]!;
  return null;
}

export async function GET() {
  const h = await headers();
  const orgSlug = h.get('x-pixeesite-org-slug');
  if (!orgSlug) return NextResponse.json({}, { status: 200 });
  const org = await platformDb.org.findUnique({ where: { slug: orgSlug }, select: { id: true } }).catch(() => null);
  if (!org) return NextResponse.json({}, { status: 200 });

  const [clarity, hotjar] = await Promise.all([
    getOrgPublicId(org.id, 'MICROSOFT_CLARITY_ID'),
    getOrgPublicId(org.id, 'HOTJAR_ID'),
  ]);

  return NextResponse.json(
    {
      clarity: clarity || undefined,
      hotjar: hotjar || undefined,
    },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
  );
}
