import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeUrlMetadata } from '@/lib/og-scraper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/webhooks/email-events
 *
 * Endpoint qui reçoit les emails forwardés par l'utilisateur depuis sa boîte mail
 * (notifications Facebook "you've been invited to..." typiquement).
 *
 * Compatible avec :
 * - Resend Inbound Webhook (https://resend.com/docs/dashboard/emails/inbound)
 * - Mailgun Routes (https://documentation.mailgun.com/en/latest/user_manual.html#routes)
 * - SendGrid Inbound Parse (https://docs.sendgrid.com/for-developers/parsing-email/inbound-email)
 * - Cloudflare Email Workers
 *
 * Sécurité : header `x-webhook-secret` doit matcher EMAIL_WEBHOOK_SECRET env.
 *
 * Setup :
 * 1. Configure events@gld.pixeeplay.com dans Resend/Mailgun → forward webhook ici
 * 2. Dans Gmail, créer une règle : From:facebookmail.com → Forward to events@gld.pixeeplay.com
 * 3. Le user doit aussi spécifier son email d'expéditeur dans /espace-pro pour qu'on le matche à un User
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');
  if (process.env.EMAIL_WEBHOOK_SECRET && secret !== process.env.EMAIL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 403 });
  }

  let payload: any;
  try { payload = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  // Normalise selon le provider (Resend, Mailgun, SendGrid)
  const fromEmail = (payload.from?.address || payload.from || payload.sender || payload['envelope-sender'] || '').toLowerCase();
  const subject   = payload.subject || payload['Subject'] || '';
  const textBody  = payload.text || payload['body-plain'] || payload['stripped-text'] || '';
  const htmlBody  = payload.html || payload['body-html'] || payload['stripped-html'] || '';
  const forwardedBy = payload.forwarded_by || payload['x-forwarded-for'] || ''; // Si forward, contient l'expéditeur original

  const allText = `${subject}\n${textBody}\n${htmlBody}\n${forwardedBy}`;

  // 1) Trouver le User correspondant — via l'email de forward
  // L'utilisateur doit avoir renseigné son email d'expéditeur dans son profil
  const user = await prisma.user.findFirst({
    where: { email: { in: [fromEmail, forwardedBy.toLowerCase()].filter(Boolean) } }
  });
  if (!user) {
    console.warn('[email-webhook] no matching user for', fromEmail);
    return NextResponse.json({ ok: false, reason: 'no matching user' }, { status: 200 });
  }

  // 2) Extraire l'URL d'event Facebook depuis le corps
  const fbEventMatch = allText.match(/https?:\/\/(?:www\.|m\.)?facebook\.com\/events\/(\d+)[^\s"'<>]*/i);
  const eventbriteMatch = allText.match(/https?:\/\/(?:www\.)?eventbrite\.[a-z]+\/e\/[^\s"'<>]+/i);
  const meetupMatch = allText.match(/https?:\/\/(?:www\.)?meetup\.com\/[^\s"'<>]+\/events\/\d+/i);

  const url = fbEventMatch?.[0] || eventbriteMatch?.[0] || meetupMatch?.[0];
  if (!url) {
    return NextResponse.json({ ok: false, reason: 'no event URL found in email' }, { status: 200 });
  }

  // 3) Idempotence : déjà importé ?
  const existing = await prisma.event.findFirst({
    where: { OR: [{ externalUrl: url }, { url }] }
  }).catch(() => null);
  if (existing) {
    return NextResponse.json({ ok: true, alreadyImported: true, event: existing });
  }

  // 4) Scrape l'URL pour récupérer les détails
  const meta = await scrapeUrlMetadata(url);
  if (!meta.title || !meta.startsAt) {
    return NextResponse.json({
      ok: false,
      reason: 'scraping failed',
      meta,
      hint: 'event probably private or FB blocked the bot — fallback to subject parsing'
    }, { status: 200 });
  }

  // 5) Si le user possède un venue qui matche la ville/lieu, on lie
  let venueId: string | null = null;
  if (meta.location || meta.city) {
    const venue = await prisma.venue.findFirst({
      where: {
        ownerId: user.id,
        OR: [
          { name: { contains: meta.location || '', mode: 'insensitive' } },
          { city: { contains: meta.city || '', mode: 'insensitive' } }
        ]
      }
    });
    if (venue) venueId = venue.id;
  }

  // 6) Crée l'event en BROUILLON (curation manuelle dans /admin/events)
  const slug = `email-${meta.detectedSource}-${Date.now().toString(36)}`;
  let externalId: string | null = null;
  if (meta.detectedSource === 'facebook') {
    const m = url.match(/facebook\.com\/events\/(\d+)/);
    if (m) externalId = m[1];
  }

  const event = await prisma.event.create({
    data: {
      slug,
      title: meta.title,
      description: meta.description || null,
      startsAt: new Date(meta.startsAt),
      endsAt: meta.endsAt ? new Date(meta.endsAt) : null,
      location: meta.location || null,
      city: meta.city || null,
      country: meta.country || null,
      coverImage: meta.image || null,
      url,
      tags: [meta.detectedSource, 'email-import'],
      venueId,
      published: false, // toujours brouillon depuis email
      externalSource: meta.detectedSource,
      externalId,
      externalUrl: url
    }
  });

  return NextResponse.json({ ok: true, event, importedFor: user.email });
}
