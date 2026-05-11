import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { dropshipTest, type DropProvider } from '@/lib/dropshipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/orgs/[slug]/dropshipping/test
 * body: { provider: 'aliexpress' | 'spocket' | 'printful' }
 *
 * Vérifie que la clé API du provider est configurée et fonctionne.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const orgId = auth.membership.org.id;
  const body = await req.json().catch(() => ({} as any));
  const provider = body.provider as DropProvider | undefined;
  if (!provider) return NextResponse.json({ ok: false, message: 'provider required' });

  try {
    const result = await dropshipTest(provider, orgId);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: `Erreur interne : ${e?.message || 'inconnue'}` }, { status: 500 });
  }
}
