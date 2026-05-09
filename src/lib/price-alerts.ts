/**
 * price-alerts — système d'alertes sur les variations de prix.
 *
 * Déclencheurs :
 *   1. Un concurrent passe SOUS le `targetPriceCents` du watch
 *   2. Une baisse de prix > `alertThresholdPct` (par défaut 10%) chez un concurrent
 *   3. Un produit revient en stock après rupture (transition lastInStock=false → inStock=true)
 *
 * Anti-spam : 1 alerte max par watch par 24h (cf. lastAlertAt).
 *
 * Canaux :
 *   - Email via Resend (déjà configuré dans GLD : RESEND_API_KEY)
 *   - Webhook Slack via PRICE_ALERT_SLACK_WEBHOOK (optionnel)
 *
 * Adresse email destinataire : settings `prices.alertEmail` ou env PRICE_ALERT_EMAIL,
 * fallback ADMIN_EMAIL.
 */

import { prisma } from './prisma';
import { getSettings } from './settings';

type RefreshDetail = {
  competitorId: string;
  domain: string;
  url: string;
  ok: boolean;
  priceCents?: number;
  delta?: number;
  deltaPct?: number;
  inStock?: boolean | null;       // disponibilité observée au snapshot courant
  prevInStock?: boolean | null;   // disponibilité observée au snapshot précédent (pour restock)
  error?: string;
};

type RefreshResultMin = {
  watchId: string;
  watchName: string;
  details: RefreshDetail[];
};

/**
 * Vérifie si une alerte doit être déclenchée pour ce watch après son refresh.
 * Appelé en best-effort depuis price-tracker.refreshWatch.
 */
export async function checkPriceAlerts(watchId: string, refreshResult: RefreshResultMin): Promise<void> {
  const watch = await prisma.priceWatch.findUnique({ where: { id: watchId } });
  if (!watch || !watch.active) return;

  // Anti-spam : pas d'alerte si une a été envoyée < 24h
  if (watch.lastAlertAt && Date.now() - watch.lastAlertAt.getTime() < 24 * 3600_000) return;

  const triggers: { type: string; details: string }[] = [];

  // 1. Sous prix cible ?
  if (watch.targetPriceCents) {
    const underTarget = refreshResult.details
      .filter((d) => d.ok && d.priceCents != null && d.priceCents < watch.targetPriceCents!)
      .map((d) => `${d.domain} : ${(d.priceCents! / 100).toFixed(2)} €`);
    if (underTarget.length > 0) {
      triggers.push({
        type: 'target',
        details: `Prix sous le seuil cible (${(watch.targetPriceCents / 100).toFixed(2)} €) :\n  • ` + underTarget.join('\n  • '),
      });
    }
  }

  // 2. Baisse > seuil %
  const drops = refreshResult.details
    .filter((d) => d.ok && d.deltaPct != null && d.deltaPct < -watch.alertThresholdPct)
    .map((d) => `${d.domain} : ${d.deltaPct}% (passe à ${((d.priceCents || 0) / 100).toFixed(2)} €)`);
  if (drops.length > 0) {
    triggers.push({
      type: 'drop',
      details: `Baisse > ${watch.alertThresholdPct}% détectée :\n  • ` + drops.join('\n  • '),
    });
  }

  // 3. Retour en stock (transition false → true)
  const restocks = refreshResult.details
    .filter((d) => d.ok && d.inStock === true && d.prevInStock === false)
    .map((d) =>
      d.priceCents != null
        ? `${d.domain} : ${(d.priceCents / 100).toFixed(2)} €`
        : d.domain
    );
  if (restocks.length > 0) {
    triggers.push({
      type: 'restock',
      details: `Retour en stock après rupture :\n  • ` + restocks.join('\n  • '),
    });
  }

  if (triggers.length === 0) return;

  // Envoie alertes
  await sendAlert(watch, triggers, refreshResult);

  await prisma.priceWatch.update({
    where: { id: watchId },
    data: { lastAlertAt: new Date() },
  });
}

async function sendAlert(watch: any, triggers: { type: string; details: string }[], r: RefreshResultMin) {
  const settings = await getSettings(['prices.alertEmail', 'prices.slackWebhook']).catch(() => ({} as any));
  const email = settings['prices.alertEmail'] || process.env.PRICE_ALERT_EMAIL || process.env.ADMIN_EMAIL || '';
  const slack = settings['prices.slackWebhook'] || process.env.PRICE_ALERT_SLACK_WEBHOOK || '';

  const subject = `🔔 Alerte prix : ${watch.name}`;
  const body = [
    `Alerte prix pour « ${watch.name} »${watch.brand ? ` (${watch.brand})` : ''}`,
    '',
    ...triggers.map((t) => t.details),
    '',
    `Voir le détail : https://gld.pixeeplay.com/admin/prices/${watch.id}`,
  ].join('\n');

  // EMAIL via Resend — log les échecs au lieu de swallow
  const resendKey = process.env.RESEND_API_KEY;
  if (email && resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'GLD Comparator <noreply@gld.pixeeplay.com>',
          to: email,
          subject,
          text: body,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        const detail = await resp.text().catch(() => '');
        console.warn(`[price-alerts] Resend HTTP ${resp.status} for watch=${watch.id}: ${detail.slice(0, 200)}`);
      }
    } catch (e: any) {
      console.warn(`[price-alerts] Resend network error for watch=${watch.id}:`, e?.message || e);
    }
  } else if (!resendKey) {
    console.info(`[price-alerts] RESEND_API_KEY absent — email skipped for watch=${watch.id}`);
  }

  // SLACK — log les échecs
  if (slack) {
    try {
      const resp = await fetch(slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: subject,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: subject } },
            { type: 'section', text: { type: 'mrkdwn', text: '```' + body + '```' } },
            {
              type: 'actions', elements: [
                { type: 'button', text: { type: 'plain_text', text: 'Voir le détail' }, url: `https://gld.pixeeplay.com/admin/prices/${watch.id}` },
              ]
            },
          ],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        const detail = await resp.text().catch(() => '');
        console.warn(`[price-alerts] Slack HTTP ${resp.status} for watch=${watch.id}: ${detail.slice(0, 200)}`);
      }
    } catch (e: any) {
      console.warn(`[price-alerts] Slack network error for watch=${watch.id}:`, e?.message || e);
    }
  }
}
