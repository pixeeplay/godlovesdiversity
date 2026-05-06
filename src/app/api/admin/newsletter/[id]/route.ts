import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * GET /api/admin/newsletter/[id]
 * Détail d'une campagne avec progression temps réel.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const [campaign, logs, sentCount, failedCount, pendingCount] = await Promise.all([
    prisma.newsletterCampaign.findUnique({ where: { id } }),
    prisma.emailLog.findMany({
      where: { campaignId: id, status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { to: true, errorMessage: true, createdAt: true }
    }).catch(() => []),
    prisma.emailLog.count({ where: { campaignId: id, status: 'sent' } }).catch(() => 0),
    prisma.emailLog.count({ where: { campaignId: id, status: 'failed' } }).catch(() => 0),
    prisma.emailLog.count({ where: { campaignId: id, status: 'pending' } }).catch(() => 0)
  ]);

  if (!campaign) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({
    campaign,
    progress: { sent: sentCount, failed: failedCount, pending: pendingCount },
    recentFailures: logs
  });
}

/**
 * PATCH /api/admin/newsletter/[id]
 * Modifie une campagne. Body :
 *   { subject?, htmlContent?, textContent?, scheduledAt?: string|null,
 *     action?: 'send' | 'schedule' | 'unschedule' | 'duplicate' | 'save' }
 *
 * - action='save'        : update les champs textuels seulement (DRAFT only)
 * - action='schedule'    : passe en SCHEDULED avec scheduledAt
 * - action='unschedule'  : repasse en DRAFT
 * - action='send'        : envoie immédiatement à TOUS les ACTIVE (status -> SENDING)
 * - action='duplicate'   : crée un nouveau draft avec mêmes contenus
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = body.action || 'save';

  const camp = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!camp) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // ─── DUPLICATE ────────────────────────────────────────────────
  if (action === 'duplicate') {
    const dup = await prisma.newsletterCampaign.create({
      data: {
        subject: `${camp.subject} (copie)`,
        htmlContent: camp.htmlContent,
        textContent: camp.textContent,
        status: 'DRAFT',
        recipients: 0,
        recipientsCount: 0
      }
    });
    return NextResponse.json({ ok: true, id: dup.id, message: 'Brouillon dupliqué.' });
  }

  // ─── SAVE / EDIT ──────────────────────────────────────────────
  if (action === 'save') {
    if (camp.status !== 'DRAFT' && camp.status !== 'SCHEDULED') {
      return NextResponse.json({ error: `Campagne ${camp.status}, modification impossible.` }, { status: 400 });
    }
    const updated = await prisma.newsletterCampaign.update({
      where: { id },
      data: {
        ...(typeof body.subject === 'string' ? { subject: body.subject } : {}),
        ...(typeof body.htmlContent === 'string' ? { htmlContent: body.htmlContent } : {}),
        ...(typeof body.textContent === 'string' ? { textContent: body.textContent } : {})
      }
    });
    return NextResponse.json({ ok: true, campaign: updated, message: '✅ Brouillon enregistré.' });
  }

  // ─── SCHEDULE ─────────────────────────────────────────────────
  if (action === 'schedule') {
    if (!body.scheduledAt) return NextResponse.json({ error: 'scheduledAt requis (ISO date)' }, { status: 400 });
    const when = new Date(body.scheduledAt);
    if (isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: 'Date invalide ou dans le passé' }, { status: 400 });
    }
    const updated = await prisma.newsletterCampaign.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: when,
        ...(typeof body.subject === 'string' ? { subject: body.subject } : {}),
        ...(typeof body.htmlContent === 'string' ? { htmlContent: body.htmlContent } : {})
      }
    });
    return NextResponse.json({ ok: true, campaign: updated, message: `📅 Programmée le ${when.toLocaleString('fr-FR')}.` });
  }

  // ─── UNSCHEDULE ───────────────────────────────────────────────
  if (action === 'unschedule') {
    const updated = await prisma.newsletterCampaign.update({
      where: { id },
      data: { status: 'DRAFT', scheduledAt: null }
    });
    return NextResponse.json({ ok: true, campaign: updated, message: 'Programmation annulée — repassée en brouillon.' });
  }

  // ─── SEND (immediate) ─────────────────────────────────────────
  if (action === 'send') {
    if (camp.status === 'SENT' || camp.status === 'SENDING') {
      return NextResponse.json({ error: `Campagne déjà ${camp.status}.` }, { status: 400 });
    }
    const subs = await prisma.newsletterSubscriber.findMany({
      where: { status: 'ACTIVE' },
      select: { email: true }
    });
    const manualEmails: string[] = Array.isArray(body.manualRecipients)
      ? body.manualRecipients.filter((e: any) => typeof e === 'string' && e.includes('@'))
      : [];
    const dbEmails = subs.map((s) => s.email);
    const recipients = Array.from(new Set([...dbEmails, ...manualEmails]));

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire ACTIVE.' }, { status: 400 });
    }

    await prisma.newsletterCampaign.update({
      where: { id },
      data: { status: 'SENDING', recipients: recipients.length, recipientsCount: recipients.length, sentCount: 0, failedCount: 0 }
    });

    processNewsletterSend(id, body.subject || camp.subject, body.htmlContent || camp.htmlContent, recipients)
      .catch((e) => console.error('Newsletter resend failed:', e));

    return NextResponse.json({
      ok: true,
      message: `✉️ Envoi en cours à ${recipients.length} destinataire(s).`,
      recipients: recipients.length
    });
  }

  return NextResponse.json({ error: `Action inconnue: ${action}` }, { status: 400 });
}

/**
 * DELETE /api/admin/newsletter/[id]
 * Supprime une campagne (DRAFT/SCHEDULED uniquement, pas les envoyées pour archive).
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const c = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (c.status === 'SENDING') {
    return NextResponse.json({ error: 'Envoi en cours, impossible à supprimer.' }, { status: 400 });
  }
  await prisma.newsletterCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true, message: '🗑 Campagne supprimée.' });
}

/* ─────────────────────────────────────────────────────────────
   processNewsletterSend — copie de la même logique que dans
   /api/admin/newsletter/route.ts (pour réutilisation depuis PATCH).
   ───────────────────────────────────────────────────────────── */
async function processNewsletterSend(
  campaignId: string,
  subject: string,
  htmlContent: string,
  emails: string[]
) {
  const CHUNK_SIZE = 5;
  const DELAY_MS = 1100;

  let sent = 0;
  let failed = 0;
  const errors: { to: string; error: string }[] = [];

  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((to) => sendEmail(to, subject, htmlContent, { type: 'newsletter', campaignId }))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') sent++;
      else { failed++; errors.push({ to: chunk[j], error: r.reason?.message || String(r.reason) }); }
    }
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: { sentCount: sent, failedCount: failed }
    }).catch(() => {});
    if (i + CHUNK_SIZE < emails.length) await new Promise((res) => setTimeout(res, DELAY_MS));
  }

  const finalStatus = failed === 0 ? 'SENT' : (sent === 0 ? 'FAILED' : 'SENT');
  await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: { status: finalStatus as any, sentAt: new Date(), sentCount: sent, failedCount: failed }
  }).catch(() => {});

  if (errors.length > 0) {
    console.warn(`[Newsletter ${campaignId}] ${failed} échecs sur ${emails.length}`, errors.slice(0, 5));
  }
}
