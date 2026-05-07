import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';
import { checkQuota, bumpQuota } from '@/lib/ai-autopilot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// ────────────────────────────────────────────────
// THÈMES SUGGÉRÉS PAR SEMAINE (pour 1 an)
// ────────────────────────────────────────────────
function getWeekTheme(date: Date): string {
  const m = date.getMonth();
  const d = date.getDate();
  // Fêtes / périodes thématiques
  if (m === 5 && d >= 1 && d <= 30) return 'Pride Month — fierté LGBT';
  if (m === 11 && d >= 18 && d <= 25) return 'Noël inclusif';
  if (m === 0 && d <= 7) return 'Bonne année — résolutions inclusives';
  if (m === 1 && d >= 11 && d <= 14) return 'Saint-Valentin queer';
  if (m === 2 && d >= 1 && d <= 31) return 'Mois Histoire LGBT';
  if (m === 9 && d >= 11 && d <= 20) return 'Coming Out Day & Visibility Week';
  if (m === 10 && d >= 13 && d <= 20) return 'Semaine Trans Awareness';
  if (m === 11 && d >= 1) return 'Journée Mondiale Sida';
  if (m === 7 || (m === 8 && d <= 15)) return 'Rentrée — retrouver sa communauté';
  if (m === 3 && d >= 1 && d <= 30) return 'Foi & spiritualité au printemps';
  if (m === 4) return 'IDAHOBIT (17 mai) — lutte contre l\'homophobie';
  return 'Communauté & témoignages';
}

/**
 * POST /api/admin/ai/newsletter/plan
 * Body : { year?: number, regenerate?: boolean }
 *
 * Génère 52 newsletters pour l'année (titre + thème). Pas le HTML complet
 * (trop coûteux Gemini) — juste le squelette. Le HTML est généré on-demand
 * quand l'admin ouvre la newsletter pour édition.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const year = parseInt(body.year) || new Date().getFullYear();
  const regenerate = !!body.regenerate;

  const quota = await checkQuota();
  if (!quota.ok) return NextResponse.json({ error: 'quota-exceeded', used: quota.used, max: quota.max }, { status: 429 });

  // Pour chaque semaine de l'année (de la semaine actuelle, +52)
  const today = new Date();
  const startWeek = today.getMonth() === 0 && today.getDate() <= 7 ? 1 : getWeekNumber(today);
  const created: any[] = [];
  const skipped: any[] = [];

  for (let w = 0; w < 52; w++) {
    const targetDate = getWeekStartDate(year, startWeek + w);
    if (!targetDate) continue;
    if (targetDate.getFullYear() < year) continue;
    if (targetDate.getFullYear() > year + 1) break;

    const weekNum = getWeekNumber(targetDate);
    const yr = targetDate.getFullYear();
    const theme = getWeekTheme(targetDate);

    const existing = await prisma.newsletterPlan.findUnique({ where: { scheduledFor: targetDate } }).catch(() => null);
    if (existing && !regenerate) {
      skipped.push({ weekNumber: weekNum, reason: 'already-exists' });
      continue;
    }
    if (existing?.manuallyEdited) {
      skipped.push({ weekNumber: weekNum, reason: 'manually-edited-protected' });
      continue;
    }

    // Génère titre éditorial via Gemini
    let title = `Newsletter ${yr} S${weekNum}`;
    let preheader = '';
    try {
      const r = await generateText(
        `Génère un titre court et accrocheur (max 60 chars) + un preheader (max 90 chars) pour une newsletter du site parislgbt (réseau social inclusif religieux LGBT+) sur le thème : "${theme}". Date : semaine ${weekNum} de ${yr}. Réponds UNIQUEMENT en JSON strict : {"title":"...","preheader":"..."}`
      );
      await bumpQuota(1);
      const parsed = JSON.parse((r.text || '{}').replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
      title = parsed.title?.slice(0, 60) || title;
      preheader = parsed.preheader?.slice(0, 90) || '';
    } catch {}

    const data = {
      scheduledFor: targetDate,
      weekNumber: weekNum,
      year: yr,
      title,
      theme,
      preheader,
      status: 'draft',
      manuallyEdited: false
    };
    if (existing) {
      await prisma.newsletterPlan.update({ where: { id: existing.id }, data });
    } else {
      await prisma.newsletterPlan.create({ data });
    }
    created.push({ weekNumber: weekNum, year: yr, title, theme });

    // Petit délai pour ne pas saturer
    await new Promise((r) => setTimeout(r, 300));

    // Stop si quota dépasse pendant la boucle
    const q = await checkQuota();
    if (!q.ok) {
      created.push({ stopped: 'quota-exhausted', at: w });
      break;
    }
  }

  return NextResponse.json({
    ok: true,
    year,
    created: created.length,
    skipped: skipped.length,
    quotaUsed: (await checkQuota()).used,
    items: created.slice(0, 60)
  });
}

/**
 * GET /api/admin/ai/newsletter/plan?year=2026
 * Liste toutes les entrées du plan pour l'année.
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const year = parseInt(new URL(req.url).searchParams.get('year') || '0') || new Date().getFullYear();
  const items = await prisma.newsletterPlan.findMany({
    where: { year },
    orderBy: { scheduledFor: 'asc' }
  });
  return NextResponse.json({ year, items });
}

// Helpers ISO week
function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
function getWeekStartDate(year: number, week: number): Date | null {
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const dayNr = (jan4.getDay() + 6) % 7;
  const ISOweek1Monday = new Date(jan4);
  ISOweek1Monday.setDate(jan4.getDate() - dayNr);
  const result = new Date(ISOweek1Monday);
  result.setDate(ISOweek1Monday.getDate() + (week - 1) * 7);
  return result;
}
