import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
import { buildTrackingUrl, type CarrierId } from '@/lib/shipping';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const data = await req.json();

  const before = await prisma.order.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Construit l'URL de tracking si carrier + tracking number
  let trackingUrl = data.trackingUrl;
  if (data.carrier && data.trackingNumber && !trackingUrl) {
    trackingUrl = buildTrackingUrl(data.carrier as CarrierId, data.trackingNumber);
  }

  const becameShipped = data.status === 'SHIPPED' && before.status !== 'SHIPPED';

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: data.status,
      weightGrams: data.weightGrams,
      carrier: data.carrier,
      shippingCost: data.shippingCost,
      trackingNumber: data.trackingNumber,
      trackingUrl,
      shippedAt: becameShipped ? new Date() : undefined,
      deliveredAt: data.status === 'SHIPPED' && before.deliveredAt === null && data.deliveredAt ? new Date() : undefined,
      notes: data.notes
    },
    include: { items: { include: { product: true } } }
  });

  // Si on vient de passer en SHIPPED, on notifie le client (email + SMS)
  if (becameShipped) {
    const trackingPart = updated.trackingNumber
      ? `\n\nNuméro de suivi : ${updated.trackingNumber}\n${updated.trackingUrl || ''}`
      : '';
    const followLink = `${BASE}/commande/${updated.publicToken}`;

    // Email
    if (updated.email) {
      const subject = `📦 Ta commande #${updated.id.slice(0, 8)} est expédiée !`;
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#FF2BB1">📦 Ta commande est en route !</h1>
          <p>Bonjour ${updated.name || ''},</p>
          <p>Bonne nouvelle : ta commande <strong>#${updated.id.slice(0, 8)}</strong> vient d'être expédiée par <strong>${updated.carrier || 'La Poste'}</strong>.</p>
          ${updated.trackingNumber ? `
            <div style="background:#fff5fc;padding:16px;border-radius:12px;margin:20px 0">
              <p style="margin:0 0 8px"><strong>Numéro de suivi :</strong></p>
              <p style="font-family:monospace;font-size:16px;margin:0">${updated.trackingNumber}</p>
              ${updated.trackingUrl ? `<p style="margin:12px 0 0"><a href="${updated.trackingUrl}" style="color:#FF2BB1">→ Suivre le colis</a></p>` : ''}
            </div>
          ` : ''}
          <p><a href="${followLink}" style="display:inline-block;background:#FF2BB1;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Voir ma commande</a></p>
          <p style="color:#666;font-size:14px;margin-top:30px">Merci de soutenir le mouvement 🌈<br>L'équipe God Loves Diversity</p>
        </div>`;
      void sendEmail(updated.email, subject, html).catch((e: any) => console.error('Email shipped failed', e));
      void trackingPart; // keep var used
    }

    // SMS
    if (updated.phone) {
      const smsBody = `📦 GLD : Ta commande #${updated.id.slice(0, 8)} est expédiée${updated.trackingNumber ? ` !\nSuivi : ${updated.trackingNumber}\n${updated.trackingUrl || ''}` : '.'}\nDétails : ${followLink}`;
      await sendSMS(updated.phone, smsBody).catch((e) => console.error('SMS shipped failed', e));
    }
  }

  return NextResponse.json(updated);
}
