import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessage, setFlag, deleteMessage } from '@/lib/mail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest, { params }: { params: { uid: string } }) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');
  const folder = url.searchParams.get('folder') || 'INBOX';
  if (!accountId) return NextResponse.json({ error: 'accountId-required' }, { status: 400 });
  try {
    const message = await getMessage(accountId, folder, Number(params.uid));
    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { uid: string } }) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');
  const folder = url.searchParams.get('folder') || 'INBOX';
  if (!accountId) return NextResponse.json({ error: 'accountId-required' }, { status: 400 });
  try {
    if (body.flag) {
      await setFlag(accountId, folder, Number(params.uid), body.flag, body.enable !== false);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { uid: string } }) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');
  const folder = url.searchParams.get('folder') || 'INBOX';
  if (!accountId) return NextResponse.json({ error: 'accountId-required' }, { status: 400 });
  try {
    await deleteMessage(accountId, folder, Number(params.uid));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}
