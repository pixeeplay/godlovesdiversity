import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listMessages } from '@/lib/mail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');
  const folder = url.searchParams.get('folder') || 'INBOX';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get('pageSize')) || 30));
  const search = url.searchParams.get('search') || '';
  if (!accountId) return NextResponse.json({ error: 'accountId-required' }, { status: 400 });
  try {
    const result = await listMessages(accountId, folder, { page, pageSize, search });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}
