import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { listFolders } from '@/lib/mail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const accountId = new URL(req.url).searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  try {
    const folders = await listFolders(slug, accountId);
    return NextResponse.json({ folders });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'imap-error' }, { status: 500 });
  }
}
