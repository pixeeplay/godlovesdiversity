import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { listMessages } from '@/lib/mail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');
  const folder = url.searchParams.get('folder') || 'INBOX';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get('pageSize')) || 30));
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  try {
    const result = await listMessages(slug, accountId, folder, { page, pageSize });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}
