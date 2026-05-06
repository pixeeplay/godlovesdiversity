import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_CIRCLES = ['catholic', 'protestant', 'orthodox', 'muslim', 'jewish', 'buddhist', 'hindu', 'sikh', 'interfaith', 'public'];

/**
 * GET /api/prayer-intentions?circle=...
 * Liste les intentions approuvées du cercle (ou public).
 *
 * POST /api/prayer-intentions
 * Body : { text, circle?, faith?, authorName? }
 * Crée une intention. Modération IA en arrière-plan.
 *
 * PATCH /api/prayer-intentions/[id]/pray
 * Incrémente prayerCount.
 */

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const circle = url.searchParams.get('circle') || 'public';
    const where: any = { status: 'approved' };
    if (circle && circle !== 'all') where.circle = circle === 'public' ? null : circle;
    const intentions = await (prisma as any).prayerIntention.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, authorName: true, faith: true, circle: true, text: true, prayerCount: true, isAnonymous: true, createdAt: true }
    });
    return NextResponse.json({ intentions });
  } catch {
    return NextResponse.json({ intentions: [], error: 'db-not-migrated' });
  }
}

async function moderateIntention(text: string): Promise<{ ok: boolean; reason?: string }> {
  if (text.length < 3) return { ok: false, reason: 'trop-court' };
  if (text.length > 280) return { ok: false, reason: 'trop-long' };
  // Filtre rapide local
  const banned = /(\b(merde|connard|salope|pédé|fdp)\b)|(http|www\.)/i;
  if (banned.test(text)) return { ok: false, reason: 'mots-interdits-ou-lien' };
  // Modération IA optionnelle (best-effort, ne bloque pas si échec)
  try {
    const r = await generateText(`Cette intention de prière est-elle appropriée pour une page communautaire LGBT inclusive religieuse ? Réponds UNIQUEMENT par "oui" ou "non:raison".\n\nIntention: "${text}"`);
    if ((r.text || '').toLowerCase().trim().startsWith('non')) {
      return { ok: false, reason: 'modere-ia' };
    }
  } catch {}
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = (typeof body.text === 'string' ? body.text : '').trim().slice(0, 280);
  if (!text || text.length < 3) {
    return NextResponse.json({ error: 'text-trop-court' }, { status: 400 });
  }
  const circle = VALID_CIRCLES.includes(body.circle) ? body.circle : 'public';
  const faith = typeof body.faith === 'string' ? body.faith.slice(0, 30) : null;
  const authorName = typeof body.authorName === 'string' ? body.authorName.slice(0, 40) : null;

  // Modération
  const mod = await moderateIntention(text);
  if (!mod.ok) {
    return NextResponse.json({ error: 'modere', reason: mod.reason }, { status: 400 });
  }

  try {
    const intent = await (prisma as any).prayerIntention.create({
      data: {
        text,
        circle: circle === 'public' ? null : circle,
        faith,
        authorName: authorName || null,
        isAnonymous: !authorName,
        status: 'approved'
      }
    });
    return NextResponse.json({ ok: true, intention: { id: intent.id, text: intent.text, prayerCount: 0 } });
  } catch (e: any) {
    return NextResponse.json({ error: 'create-failed', message: e?.message || 'unknown' }, { status: 500 });
  }
}

/**
 * PATCH /api/prayer-intentions  Body: { id, action: "pray" }
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (!id || body.action !== 'pray') {
    return NextResponse.json({ error: 'invalid-action' }, { status: 400 });
  }
  try {
    const updated = await (prisma as any).prayerIntention.update({
      where: { id },
      data: { prayerCount: { increment: 1 } },
      select: { id: true, prayerCount: true }
    });
    return NextResponse.json({ ok: true, intention: updated });
  } catch (e: any) {
    return NextResponse.json({ error: 'update-failed', message: e?.message }, { status: 500 });
  }
}
