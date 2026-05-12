import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getMessage, deleteMessage } from '@/lib/mail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string; uid: string }> }) {
  const { slug, uid } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');
  const folder = url.searchParams.get('folder') || 'INBOX';
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  try {
    const message = await getMessage(slug, accountId, folder, parseInt(uid, 10));
    if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; uid: string }> }) {
  const { slug, uid } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');
  const folder = url.searchParams.get('folder') || 'INBOX';
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  try {
    await deleteMessage(slug, accountId, folder, parseInt(uid, 10));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}
