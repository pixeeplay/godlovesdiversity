import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Envoie une newsletter via Resend en utilisant tous les leads avec newsletterOptIn=true.
 * Met à jour les compteurs et le statut sent.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const db = await getTenantPrisma(slug);
  const n = await (db as any).newsletter.findUnique({ where: { id } }).catch(() => null);
  if (!n) return NextResponse.json({ error: 'newsletter not found' }, { status: 404 });

  const apiKey = await getOrgSecret(auth.membership.org.id, 'RESEND_API_KEY');
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 400 });

  const fromAddr = await getOrgSecret(auth.membership.org.id, 'NEWSLETTER_FROM') || 'noreply@pixeesite.dev';
  const leads = await (db as any).lead.findMany({
    where: { newsletterOptIn: true, email: { not: null } },
    select: { email: true },
    take: 1000,
  }).catch(() => []);
  if (leads.length === 0) return NextResponse.json({ error: 'no opted-in subscribers' }, { status: 400 });

  let sent = 0; let failed = 0;
  // Batch 50 envoi pour rester sous les limites Resend
  for (let i = 0; i < leads.length; i += 50) {
    const batch = leads.slice(i, i + 50);
    await Promise.all(batch.map(async (l: any) => {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromAddr, to: l.email, subject: n.subject, html: n.bodyHtml || '<p></p>' }),
        });
        if (r.ok) sent++; else failed++;
      } catch { failed++; }
    }));
  }

  await (db as any).newsletter.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date(), recipients: leads.length },
  });

  return NextResponse.json({ ok: true, sent, failed, total: leads.length });
}
