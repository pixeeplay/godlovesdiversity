import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendMail } from '@/lib/mail-sender';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: 'destinataire requis' }, { status: 400 });
  const result = await sendMail({
    to,
    subject: '✓ Test mail GLD',
    html: `<h1 style="color:#d61b80">Test mail GLD</h1><p>Si tu reçois ceci, ta config mail marche.</p>`,
    text: 'Test mail GLD — config OK'
  });
  return NextResponse.json(result);
}
