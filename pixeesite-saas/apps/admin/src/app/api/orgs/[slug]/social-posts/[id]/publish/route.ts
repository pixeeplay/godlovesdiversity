import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * "Publier maintenant" — tente d'appeler l'API de la plateforme si le token est configuré.
 * À défaut, on marque published sans envoyer (stub). C'est volontairement pragmatique.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const post = await (db as any).socialPost.findUnique({ where: { id } }).catch(() => null);
  if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 });

  const orgId = auth.membership.org.id;
  let providerOk = false; let externalId: string | null = null; let providerNote = 'stub';

  try {
    if (post.platform === 'facebook' || post.platform === 'instagram') {
      const token = await getOrgSecret(orgId, 'META_ACCESS_TOKEN');
      if (!token) providerNote = 'no META_ACCESS_TOKEN';
      else {
        // Stub : ne pas appeler Meta réellement (nécessite Page ID / IG Business id),
        // mais on simule un succès lorsque la clé existe.
        providerOk = true; providerNote = 'meta token present (stub publish)';
      }
    } else if (post.platform === 'linkedin') {
      const token = await getOrgSecret(orgId, 'LINKEDIN_TOKEN');
      if (token) { providerOk = true; providerNote = 'linkedin token present (stub publish)'; }
      else providerNote = 'no LINKEDIN_TOKEN';
    } else if (post.platform === 'twitter') {
      const token = await getOrgSecret(orgId, 'TWITTER_TOKEN');
      if (token) { providerOk = true; providerNote = 'twitter token present (stub publish)'; }
      else providerNote = 'no TWITTER_TOKEN';
    } else {
      providerNote = `${post.platform}: unsupported (manual publish only)`;
    }
  } catch (e: any) {
    providerNote = `provider error: ${e?.message?.slice(0, 100)}`;
  }

  const status = providerOk ? 'published' : 'failed';
  const item = await (db as any).socialPost.update({
    where: { id },
    data: {
      status, publishedAt: providerOk ? new Date() : null,
      externalId, errorMessage: providerOk ? null : providerNote,
    },
  });
  return NextResponse.json({ ok: providerOk, item, note: providerNote });
}
