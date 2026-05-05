import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const setting = await prisma.setting.findUnique({ where: { key: `user.2fa.${(s.user as any).id}` } }).catch(() => null);
  const enabled = !!setting && setting.value !== '';
  return NextResponse.json({ enabled });
}
