import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runI18nAudit } from '@/lib/i18n-audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/i18n/audit
 * Renvoie un rapport JSON listant toutes les traductions manquantes
 * (Pages, Articles, Banners, MenuItems, PageSections × FR/EN/ES/PT).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Auth requise' }, { status: 401 });

  try {
    const report = await runI18nAudit();
    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur audit' }, { status: 500 });
  }
}
