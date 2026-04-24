import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

  const sub = await prisma.newsletterSubscriber.findUnique({ where: { confirmToken: token } });
  if (!sub) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/newsletter?confirm=invalid`);

  await prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { status: 'ACTIVE', confirmedAt: new Date(), confirmToken: null }
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/newsletter?confirm=ok`);
}
