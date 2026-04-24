import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const [campaigns, subs] = await Promise.all([
    prisma.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } })
  ]);
  return NextResponse.json({ campaigns, activeSubscribers: subs });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const c = await prisma.newsletterCampaign.create({
    data: {
      subject: body.subject,
      htmlContent: body.htmlContent,
      textContent: body.textContent,
      status: body.send ? 'SENDING' : 'DRAFT'
    }
  });

  if (body.send) {
    const subs = await prisma.newsletterSubscriber.findMany({ where: { status: 'ACTIVE' } });
    let sent = 0;
    for (const sub of subs) {
      try {
        await sendEmail(sub.email, body.subject, body.htmlContent);
        sent++;
      } catch (e) {
        console.error('email fail', sub.email, e);
      }
    }
    await prisma.newsletterCampaign.update({
      where: { id: c.id },
      data: { status: 'SENT', sentAt: new Date(), recipients: sent }
    });
  }

  return NextResponse.json({ ok: true, id: c.id });
}
