import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max pour serverless (sinon background continue)

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const [campaigns, subs] = await Promise.all([
    prisma.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } })
  ]);
  return NextResponse.json({ campaigns, activeSubscribers: subs });
}

/**
 * Crée une campagne. Si send=true, lance l'envoi en background et retourne immédiatement.
 * Le client peut poller GET /api/admin/newsletter/[id] pour voir l'avancement.
 *
 * Body :
 *   { subject, htmlContent, textContent?, send?, manualRecipients?: string[] }
 */
export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();

  if (!body.subject || !body.htmlContent) {
    return NextResponse.json({ error: 'subject et htmlContent requis' }, { status: 400 });
  }

  // Liste destinataires : abonnés ACTIVE + manuels (sans doublons)
  const manualEmails: string[] = Array.isArray(body.manualRecipients)
    ? body.manualRecipients.filter((e: any) => typeof e === 'string' && e.includes('@'))
    : [];

  let recipientEmails: string[] = [];
  // target: 'all' (default, ACTIVE + manuel) | 'manual' (manuel uniquement)
  const target = body.target === 'manual' ? 'manual' : 'all';
  if (body.send) {
    if (target === 'manual') {
      recipientEmails = Array.from(new Set(manualEmails));
    } else {
      const subs = await prisma.newsletterSubscriber.findMany({
        where: { status: 'ACTIVE' },
        select: { email: true }
      });
      const dbEmails = subs.map((s) => s.email);
      recipientEmails = Array.from(new Set([...dbEmails, ...manualEmails]));
    }

    if (recipientEmails.length === 0) {
      return NextResponse.json({
        error: target === 'manual'
          ? 'Aucun email manuel ajouté à la liste.'
          : 'Aucun destinataire. Ajoute des abonnés ACTIVE ou des emails manuels.'
      }, { status: 400 });
    }
  }

  const campaign = await prisma.newsletterCampaign.create({
    data: {
      subject: body.subject,
      htmlContent: body.htmlContent,
      textContent: body.textContent,
      status: body.send ? 'SENDING' : 'DRAFT',
      // recipients = compteur historique gardé pour rétro-compat
      // recipientsCount = nombre TOTAL ciblé (snapshot, ne bouge plus)
      // sentCount = compteur incrémenté pendant l'envoi
      recipients: body.send ? recipientEmails.length : 0,
      recipientsCount: body.send ? recipientEmails.length : 0,
      sentCount: 0,
      failedCount: 0
    }
  });

  if (body.send) {
    // ⚡ Fire-and-forget : on ne bloque PAS la réponse HTTP.
    // L'envoi se fait en arrière-plan, le client poll /api/admin/newsletter/[id] pour la progression.
    processNewsletterSend(campaign.id, body.subject, body.htmlContent, recipientEmails)
      .catch((e) => console.error('Newsletter background send failed:', e));
  }

  return NextResponse.json({
    ok: true,
    id: campaign.id,
    status: campaign.status,
    recipients: campaign.recipients,
    message: body.send
      ? `Campagne en cours d'envoi à ${recipientEmails.length} destinataire(s). Suis la progression dans l'historique.`
      : 'Brouillon enregistré.'
  });
}

/**
 * Tâche d'envoi en arrière-plan.
 * Envoie en parallèle par chunks de 5 (limite Resend = 10 req/sec, marge de sécurité).
 * Chaque envoi est tracé via EmailLog (avec campaignId) grâce à sendEmail().
 */
async function processNewsletterSend(
  campaignId: string,
  subject: string,
  htmlContent: string,
  emails: string[]
) {
  const CHUNK_SIZE = 5;
  const DELAY_MS = 1100; // entre chaque chunk pour rester sous 10 req/sec Resend

  let sent = 0;
  let failed = 0;
  const errors: { to: string; error: string }[] = [];

  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((to) =>
        sendEmail(to, subject, htmlContent, { type: 'newsletter', campaignId })
      )
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        errors.push({ to: chunk[j], error: r.reason?.message || String(r.reason) });
      }
    }

    // Update intermédiaire pour montrer la progression — sentCount + failedCount
    // (on ne touche PLUS à recipients, c'est le total snapshot)
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: { sentCount: sent, failedCount: failed }
    }).catch(() => {});

    if (i + CHUNK_SIZE < emails.length) {
      await new Promise((res) => setTimeout(res, DELAY_MS));
    }
  }

  // Statut final
  const finalStatus = failed === 0 ? 'SENT' : (sent === 0 ? 'FAILED' : 'SENT');
  await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      status: finalStatus as any,
      sentAt: new Date(),
      sentCount: sent,
      failedCount: failed
    }
  }).catch(() => {});

  if (errors.length > 0) {
    console.warn(`[Newsletter ${campaignId}] ${failed} échecs sur ${emails.length}`,
      errors.slice(0, 5));
  }
}
