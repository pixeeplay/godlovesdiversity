import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/mail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const accountId = body.accountId;
  if (!accountId) return NextResponse.json({ error: 'accountId-required' }, { status: 400 });
  if (!body.to || (Array.isArray(body.to) && body.to.length === 0)) {
    return NextResponse.json({ error: 'to-required' }, { status: 400 });
  }
  if (!body.subject) return NextResponse.json({ error: 'subject-required' }, { status: 400 });

  try {
    const result = await sendEmail(accountId, {
      to: Array.isArray(body.to) ? body.to : [body.to],
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      text: body.text,
      html: body.html,
      inReplyTo: body.inReplyTo,
      references: body.references
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'smtp-error' }, { status: 500 });
  }
}
