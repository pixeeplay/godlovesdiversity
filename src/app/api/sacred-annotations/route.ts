import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';
import { bumpQuota, checkQuota } from '@/lib/ai-autopilot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * "Genius" des textes sacrés inclusifs — annotations communautaires.
 *
 * GET /api/sacred-annotations?scripture=&reference=&faith=
 * POST /api/sacred-annotations { scripture, reference, passageText, annotation, faith, perspective?, authorName? }
 * PATCH /api/sacred-annotations { id, action: "upvote" }
 */

const VALID_SCRIPTURES = ['bible', 'quran', 'talmud', 'tipitaka', 'vedas', 'guru-granth-sahib', 'other'];
const VALID_FAITHS = ['christian', 'muslim', 'jewish', 'buddhist', 'hindu', 'sikh', 'interfaith'];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scripture = url.searchParams.get('scripture');
  const reference = url.searchParams.get('reference');
  const faith = url.searchParams.get('faith');
  const where: any = { status: 'approved' };
  if (scripture) where.scripture = scripture;
  if (reference) where.reference = reference;
  if (faith) where.faith = faith;
  try {
    const annotations = await (prisma as any).sacredAnnotation.findMany({
      where,
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
      take: 100
    });
    return NextResponse.json({ annotations });
  } catch {
    return NextResponse.json({ annotations: [] });
  }
}

async function moderate(text: string): Promise<{ ok: boolean; reason?: string }> {
  if (text.length < 10) return { ok: false, reason: 'trop-court' };
  if (text.length > 4000) return { ok: false, reason: 'trop-long' };
  // Modération IA
  const quota = await checkQuota();
  if (quota.ok) {
    try {
      const r = await generateText(`Cette annotation théologique inclusive est-elle appropriée (pas de propos haineux, ni anti-religieux primaire, ni LGBT-phobe) ? Réponds UNIQUEMENT par "oui" ou "non:raison".\n\nAnnotation: "${text}"`);
      await bumpQuota(1);
      if ((r.text || '').toLowerCase().trim().startsWith('non')) return { ok: false, reason: 'modere-ia' };
    } catch {}
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const scripture = String(body.scripture || '').toLowerCase();
  if (!VALID_SCRIPTURES.includes(scripture)) return NextResponse.json({ error: 'scripture-invalid' }, { status: 400 });
  const reference = String(body.reference || '').slice(0, 80).trim();
  if (!reference) return NextResponse.json({ error: 'reference-missing' }, { status: 400 });
  const passageText = String(body.passageText || '').slice(0, 1000) || null;
  const annotation = String(body.annotation || '').trim();
  if (annotation.length < 10) return NextResponse.json({ error: 'annotation-trop-courte' }, { status: 400 });
  const faith = String(body.faith || '').toLowerCase();
  if (!VALID_FAITHS.includes(faith)) return NextResponse.json({ error: 'faith-invalid' }, { status: 400 });
  const perspective = String(body.perspective || '').slice(0, 40) || null;
  const authorName = String(body.authorName || '').slice(0, 60) || null;
  const authorRole = String(body.authorRole || '').slice(0, 40) || null;

  const mod = await moderate(annotation);
  if (!mod.ok) return NextResponse.json({ error: 'modere', reason: mod.reason }, { status: 400 });

  try {
    const created = await (prisma as any).sacredAnnotation.create({
      data: { scripture, reference, passageText, annotation, faith, perspective, authorName, authorRole, status: 'approved' }
    });
    return NextResponse.json({ ok: true, annotation: created });
  } catch (e: any) {
    return NextResponse.json({ error: 'create-failed', message: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'upvote' || !body.id) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  try {
    const updated = await (prisma as any).sacredAnnotation.update({
      where: { id: body.id },
      data: { upvotes: { increment: 1 } }
    });
    return NextResponse.json({ ok: true, upvotes: updated.upvotes });
  } catch (e: any) {
    return NextResponse.json({ error: 'update-failed' }, { status: 500 });
  }
}
