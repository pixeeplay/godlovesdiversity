import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Cron : traite les newsletters SCHEDULED dont scheduledAt <= maintenant.
 * À déclencher toutes les 5 minutes par Coolify.
 *
 * Sécurité : header X-Cron-Secret = process.env.CRON_SECRET.
 *
 * Le cron PREND une campagne SCHEDULED, la passe en SENDING, l'envoie.
 * Si plusieurs sont en retard, traite la plus ancienne d'abord, une à la fois
 * pour éviter de saturer Resend (limite 10 req/sec).
 */
async function handler(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const now = new Date();
  const candidates = await prisma.newsletterCampaign.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: 3 // 3 max par run, le reste au prochain tick
  });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Rien à envoyer.' });
  }

  const summary: any[] = [];
  for (const camp of candidates) {
    try {
      const subs = await prisma.newsletterSubscriber.findMany({
        where: { status: 'ACTIVE' },
        select: { email: true }
      });
      const recipients = subs.map((s: { email: string }) => s.email);

      if (recipients.length === 0) {
        await prisma.newsletterCampaign.update({
          where: { id: camp.id },
          data: { status: 'FAILED', sentAt: new Date() }
        });
        summary.push({ id: camp.id, status: 'FAILED', reason: 'no-active-subscribers' });
        continue;
      }

      await prisma.newsletterCampaign.update({
        where: { id: camp.id },
        data: {
          status: 'SENDING',
          recipients: recipients.length,
          recipientsCount: recipients.length,
          sentCount: 0,
          failedCount: 0
        }
      });

      let sent = 0, failed = 0;
      const CHUNK = 5, DELAY_MS = 1100;
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const chunk = recipients.slice(i, i + CHUNK);
        const results = await Promise.allSettled(
          chunk.map((to: string) => sendEmail(to, camp.subject, camp.htmlContent, { type: 'newsletter', campaignId: camp.id }))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') sent++; else failed++;
        }
        await prisma.newsletterCampaign.update({
          where: { id: camp.id },
          data: { sentCount: sent, failedCount: failed }
        }).catch(() => {});
        if (i + CHUNK < recipients.length) await new Promise((res) => setTimeout(res, DELAY_MS));
      }

      const finalStatus = failed === 0 ? 'SENT' : (sent === 0 ? 'FAILED' : 'SENT');
      await prisma.newsletterCampaign.update({
        where: { id: camp.id },
        data: { status: finalStatus as any, sentAt: new Date(), sentCount: sent, failedCount: failed }
      });
      summary.push({ id: camp.id, subject: camp.subject, status: finalStatus, sent, failed, total: recipients.length });
    } catch (e: any) {
      await prisma.newsletterCampaign.update({
        where: { id: camp.id },
        data: { status: 'FAILED' }
      }).catch(() => {});
      summary.push({ id: camp.id, status: 'FAILED', reason: e?.message || 'error' });
    }
  }

  return NextResponse.json({ ok: true, processed: summary.length, summary });
}

export async function GET(req: NextRequest)  { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
