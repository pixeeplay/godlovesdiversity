import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { perceptualHash, hammingDistance } from '@/lib/imageTools';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 1. Calcule (ou réutilise) le hash de chaque photo
  const photos = await prisma.photo.findMany({
    where: { storageKey: { not: { startsWith: 'demo/' } } },
    take: 500
  });

  const hashes: { id: string; hash: string; storageKey: string }[] = [];
  for (const p of photos) {
    const flags = (p.aiModerationFlags as any) || {};
    let hash = flags.pHash;
    if (!hash) {
      try {
        const r = await fetch(publicUrl(p.storageKey));
        const buf = Buffer.from(await r.arrayBuffer());
        hash = await perceptualHash(buf);
        await prisma.photo.update({
          where: { id: p.id },
          data: { aiModerationFlags: { ...flags, pHash: hash } }
        });
      } catch { continue; }
    }
    hashes.push({ id: p.id, hash, storageKey: p.storageKey });
  }

  // 2. Cherche les paires proches (distance ≤ 5)
  const duplicates: { ids: string[]; distance: number }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < hashes.length; i++) {
    if (seen.has(hashes[i].id)) continue;
    const group = [hashes[i].id];
    for (let j = i + 1; j < hashes.length; j++) {
      if (seen.has(hashes[j].id)) continue;
      const d = hammingDistance(hashes[i].hash, hashes[j].hash);
      if (d <= 5) {
        group.push(hashes[j].id);
        seen.add(hashes[j].id);
      }
    }
    if (group.length > 1) duplicates.push({ ids: group, distance: 0 });
  }

  return NextResponse.json({ ok: true, totalScanned: hashes.length, duplicates });
}
