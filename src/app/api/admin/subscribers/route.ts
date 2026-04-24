import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('q') || undefined;
  const exp = searchParams.get('export');

  const subs = await prisma.newsletterSubscriber.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(search && { email: { contains: search, mode: 'insensitive' } })
    },
    orderBy: { createdAt: 'desc' },
    take: exp ? 10000 : 500
  });

  if (exp === 'csv') {
    const csv = [
      ['email', 'status', 'locale', 'source', 'createdAt', 'confirmedAt'].join(','),
      ...subs.map((s) => [
        s.email,
        s.status,
        s.locale,
        s.source || '',
        s.createdAt.toISOString(),
        s.confirmedAt?.toISOString() || ''
      ].join(','))
    ].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="abonnes-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  const stats = await prisma.newsletterSubscriber.groupBy({ by: ['status'], _count: true });
  const counts = Object.fromEntries(stats.map((x) => [x.status, x._count]));

  return NextResponse.json({ subscribers: subs, counts });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const sub = await prisma.newsletterSubscriber.upsert({
    where: { email: body.email },
    update: {
      locale: body.locale || 'fr',
      status: body.status || 'ACTIVE',
      confirmedAt: body.status === 'ACTIVE' ? new Date() : null
    },
    create: {
      email: body.email,
      locale: body.locale || 'fr',
      status: body.status || 'ACTIVE',
      source: body.source || 'admin',
      confirmedAt: body.status === 'ACTIVE' ? new Date() : null,
      unsubToken: crypto.randomBytes(24).toString('hex')
    }
  });
  return NextResponse.json({ ok: true, subscriber: sub });
}
