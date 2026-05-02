import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail, notifyAdmin } from '@/lib/email';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const Body = z.object({
  email: z.string().email(),
  locale: z.string().default('fr')
});

export async function POST(req: Request) {
  // Anti-spam : max 3 inscriptions / IP / heure
  const rl = rateLimit(req, { key: 'newsletter', max: 3, windowMs: 60 * 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { email, locale } = parsed.data;
  const confirmToken = crypto.randomBytes(24).toString('hex');

  const sub = await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: { locale, confirmToken, status: 'PENDING' },
    create: { email, locale, confirmToken, status: 'PENDING' }
  });

  const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/newsletter/confirm?token=${confirmToken}`;

  await sendEmail(
    email,
    'Confirmez votre inscription — God Loves Diversity',
    `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:12px">
      <h1 style="color:#FF1493">Bienvenue 🌈</h1>
      <p>Pour recevoir la newsletter, confirme ton email :</p>
      <p><a href="${confirmUrl}" style="display:inline-block;background:#FF1493;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Confirmer mon email</a></p>
      <p style="color:#888;font-size:12px">Tu peux te désinscrire en un clic à tout moment.</p>
    </div>`
  ).catch(() => {});

  notifyAdmin(
    'Nouvelle inscription newsletter',
    `<p>Nouveau pré-abonné : <strong>${email}</strong> (${locale})</p>`
  ).catch(() => {});

  return NextResponse.json({ ok: true, id: sub.id });
}
