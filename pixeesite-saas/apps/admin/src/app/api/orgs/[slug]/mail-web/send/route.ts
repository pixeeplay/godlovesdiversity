import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { sendEmail } from '@/lib/mail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.accountId || !b.to || !b.subject) return NextResponse.json({ error: 'accountId, to & subject required' }, { status: 400 });
  const toList = Array.isArray(b.to) ? b.to : String(b.to).split(',').map((s: string) => s.trim()).filter(Boolean);
  try {
    const result = await sendEmail(slug, b.accountId, {
      to: toList,
      cc: Array.isArray(b.cc) ? b.cc : undefined,
      bcc: Array.isArray(b.bcc) ? b.bcc : undefined,
      subject: b.subject,
      text: b.text || undefined,
      html: b.html || undefined,
      inReplyTo: b.inReplyTo,
      references: Array.isArray(b.references) ? b.references : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'smtp-error' }, { status: 500 });
  }
}
