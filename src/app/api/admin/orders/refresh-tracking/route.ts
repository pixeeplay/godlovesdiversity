import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParcelStatus } from '@/lib/sendcloud';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';

/**
 * Met à jour le statut de toutes les commandes SHIPPED via Sendcloud.
 * À appeler via cron (toutes les 6h par exemple).
 * Si une commande passe à "Delivered" → notifie le client.
 *
 * Aussi accessible via curl avec un token (CRON_SECRET) pour les schedulers externes.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  const cronSecret = req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  const ok = !!s || (expected && cronSecret === expected);
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { status: 'SHIPPED', deliveredAt: null, trackingNumber: { not: null } },
    take: 50
  });

  const updates: any[] = [];
  for (const o of orders) {
    // On ne sait suivre que les colis créés via Sendcloud (notes contiennent "parcelId=…")
    const m = o.notes?.match(/parcelId=(\d+)/);
    if (!m) continue;
    const parcelId = Number(m[1]);
    try {
      const parcel = await getParcelStatus(parcelId);
      const status = parcel?.status?.message || '';
      const isDelivered = /deliver|livré|remis/i.test(status);
      if (isDelivered) {
        await prisma.order.update({
          where: { id: o.id },
          data: { deliveredAt: new Date() }
        });
        // Notifier
        if (o.email) {
          await sendEmail(
            o.email,
            `✅ Ta commande #${o.id.slice(0, 8)} est livrée !`,
            `<p>Bonjour ${o.name || ''},</p><p>Bonne nouvelle : ta commande a été <strong>livrée</strong> ! 🎉</p><p>Merci pour ton soutien au mouvement.<br>L'équipe parislgbt 🌈</p>`
          ).catch(() => {});
        }
        if (o.phone) {
          await sendSMS(o.phone, `✅ GLD : Ta commande #${o.id.slice(0, 8)} a été livrée. Merci pour ton soutien ! 🌈`).catch(() => {});
        }
        updates.push({ id: o.id, newStatus: 'DELIVERED' });
      }
    } catch (e: any) {
      updates.push({ id: o.id, error: e.message });
    }
  }

  return NextResponse.json({ checked: orders.length, updates });
}
