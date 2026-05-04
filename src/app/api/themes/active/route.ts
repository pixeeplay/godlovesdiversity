import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isInActivationWindow } from '@/lib/holiday-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/themes/active
 * Renvoie le thème actuellement actif :
 * 1. Thème activé manuellement (active=true) — priorité absolue
 * 2. Sinon : thème auto-activé dont la fenêtre courante matche, plus haute priorité gagne
 * 3. Sinon : null (= défaut neon-cathedral)
 */
export async function GET() {
  let theme: any = null;
  try {
    // Priorité 1 : manuel
    theme = await prisma.theme.findFirst({
      where: { active: true },
      orderBy: { priority: 'desc' }
    });

    // Priorité 2 : auto par date
    if (!theme) {
      const candidates = await prisma.theme.findMany({
        where: { autoActivate: true, active: false },
        orderBy: { priority: 'desc' }
      });
      const now = new Date();
      for (const c of candidates) {
        const inWindow = isInActivationWindow({
          holidaySlug: c.holidaySlug,
          autoStartMonth: c.autoStartMonth,
          autoStartDay: c.autoStartDay,
          daysBefore: c.daysBefore,
          durationDays: c.durationDays,
          now
        });
        if (inWindow) { theme = c; break; }
      }
    }
  } catch { /* migration */ }

  if (!theme) return NextResponse.json({ theme: null });
  return NextResponse.json({ theme });
}
