import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runI18nAudit, SUPPORTED_LOCALES } from '@/lib/i18n-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min — peut être long avec Gemini

/**
 * POST /api/admin/i18n/translate-all
 * Lance la traduction de TOUTES les entités manquantes en boucle.
 * Renvoie un compte-rendu : combien de succès, combien d'échecs, par modèle.
 */
export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const report = await runI18nAudit();
  const origin = new URL(req.url).origin;

  const results: Array<{ model: string; key: string; sourceId: string; targets: string[]; ok: number; failed: number }> = [];

  for (const entity of report.entities) {
    try {
      const r = await fetch(`${origin}/api/admin/i18n/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cookie': req.headers.get('cookie') || '' },
        body: JSON.stringify({
          model: entity.model,
          sourceId: entity.id,
          targetLocales: entity.missingLocales
        })
      });
      const j = await r.json();
      const ok = (j.results || []).filter((x: any) => x.ok).length;
      const failed = (j.results || []).length - ok;
      results.push({ model: entity.model, key: entity.key, sourceId: entity.id, targets: entity.missingLocales, ok, failed });
    } catch (e: any) {
      results.push({ model: entity.model, key: entity.key, sourceId: entity.id, targets: entity.missingLocales, ok: 0, failed: entity.missingLocales.length });
    }
  }

  const totalOk = results.reduce((a, b) => a + b.ok, 0);
  const totalFailed = results.reduce((a, b) => a + b.failed, 0);

  return NextResponse.json({
    ok: true,
    processed: results.length,
    totalOk,
    totalFailed,
    results
  });
}
