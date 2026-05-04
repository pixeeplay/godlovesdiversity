import { NextRequest, NextResponse } from 'next/server';
import { runI18nAudit } from '@/lib/i18n-audit';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Cron quotidien — vérifie les traductions manquantes et envoie une notif
 * (Slack / Telegram / Discord / Webhook selon ce qui est configuré dans /admin/integrations).
 *
 * Sécurité : vérifie le header X-Cron-Secret = settings.cron.secret OU process.env.CRON_SECRET.
 *
 * À planifier :
 *  - Coolify scheduled tasks → curl -H "X-Cron-Secret: $SECRET" https://gld.pixeeplay.com/api/cron/i18n-audit
 *  - cron-job.org / Vercel Cron / EasyCron — daily 09:00 Europe/Paris
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');

  if (expected && expected !== provided) {
    return NextResponse.json({ error: 'Unauthorized cron call' }, { status: 401 });
  }

  const report = await runI18nAudit();

  // Pas de manques → on dit rien, juste log
  if (report.totalIssues === 0) {
    return NextResponse.json({
      ok: true,
      action: 'no-notification',
      message: 'Toutes les traductions sont à jour',
      report
    });
  }

  // Construit le message — top 5 entités les plus incomplètes
  const top = report.entities.slice(0, 5);
  const summary = Object.entries(report.byModel)
    .filter(([, st]) => st.entitiesWithMissing > 0)
    .map(([m, st]) => `${m}: ${st.entitiesWithMissing}/${st.totalEntities} incomplet${st.entitiesWithMissing > 1 ? 's' : ''}`)
    .join(' · ');

  const detail = top
    .map((e) => `• ${e.model} « ${e.key.slice(0, 40)} » manque ${e.missingLocales.join('+')}`)
    .join('\n');

  await notify({
    event: 'i18n.audit',
    title: `🌍 ${report.totalIssues} traduction${report.totalIssues > 1 ? 's' : ''} manquante${report.totalIssues > 1 ? 's' : ''} sur GLD`,
    body: `${summary}\n\n${detail}\n\n→ /admin/i18n pour traduire en 1 clic avec Gemini`,
    url: 'https://gld.pixeeplay.com/admin/i18n',
    level: 'warning'
  });

  return NextResponse.json({
    ok: true,
    action: 'notified',
    totalIssues: report.totalIssues,
    summary,
    topEntities: top
  });
}
