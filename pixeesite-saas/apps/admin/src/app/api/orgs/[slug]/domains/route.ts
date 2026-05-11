import { NextRequest, NextResponse } from 'next/server';
import { promises as dns } from 'dns';
import { randomBytes } from 'crypto';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/domains : liste les custom domains
 * POST /api/orgs/[slug]/domains : ajoute un custom domain { domain }
 *
 * Le user doit pointer un CNAME `mon-domaine.com → render.pixeeplay.com`.
 * L'API génère un verifyToken qu'il doit aussi mettre en TXT record
 * `_pixeesite.mon-domaine.com`. Une cron tente la résolution toutes les 5min.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const domains = await platformDb.customDomain.findMany({
    where: { orgId: auth.membership.org.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ domains });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const domain = (body.domain as string)?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain || !domain.includes('.')) return NextResponse.json({ error: 'invalid-domain' }, { status: 400 });

  const existing = await platformDb.customDomain.findUnique({ where: { domain } });
  if (existing) return NextResponse.json({ error: 'domain-already-used' }, { status: 409 });

  const verifyToken = randomBytes(16).toString('hex');
  const cd = await platformDb.customDomain.create({
    data: {
      orgId: auth.membership.org.id,
      siteId: body.siteId || null,
      domain,
      verifyToken,
    },
  });

  return NextResponse.json({
    ok: true,
    domain: cd,
    instructions: {
      cname: { name: domain, value: 'render.pixeeplay.com' },
      txt: { name: `_pixeesite.${domain}`, value: `pixeesite-verify=${verifyToken}` },
    },
  }, { status: 201 });
}

/**
 * PATCH /api/orgs/[slug]/domains?id=xxx : action=verify pour relancer la verification
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id-required' }, { status: 400 });
  const cd = await platformDb.customDomain.findFirst({ where: { id, orgId: auth.membership.org.id } });
  if (!cd) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // Vérif TXT
  let cnameOk = false;
  let txtOk = false;
  try {
    const cname = await dns.resolveCname(cd.domain);
    cnameOk = cname.some((r) => r.includes('pixeeplay.com') || r.includes('pixeesite.app'));
  } catch {}
  try {
    const txt = await dns.resolveTxt(`_pixeesite.${cd.domain}`);
    txtOk = txt.flat().some((r) => r === `pixeesite-verify=${cd.verifyToken}`);
  } catch {}

  const verified = cnameOk && txtOk;
  if (verified) {
    await platformDb.customDomain.update({
      where: { id: cd.id },
      data: { verified: true, lastCheckAt: new Date(), lastError: null },
    });
    // Provision Caddy SSL via API admin
    void provisionCaddyDomain(cd.domain).catch((e) => {
      console.error('[caddy-provision]', e);
    });
  } else {
    await platformDb.customDomain.update({
      where: { id: cd.id },
      data: {
        lastCheckAt: new Date(),
        lastError: !cnameOk ? 'cname-not-pointing' : 'txt-record-missing',
      },
    });
  }

  return NextResponse.json({ ok: true, verified, cnameOk, txtOk });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id-required' }, { status: 400 });
  const cd = await platformDb.customDomain.findFirst({ where: { id, orgId: auth.membership.org.id } });
  if (!cd) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  await platformDb.customDomain.delete({ where: { id } });
  // TODO: remove from Caddy aussi
  return NextResponse.json({ ok: true });
}

/** Ajoute le domaine au Caddy via l'admin API pour qu'il provisionne le cert. */
async function provisionCaddyDomain(domain: string) {
  const caddyUrl = process.env.CADDY_ADMIN_URL;
  if (!caddyUrl) return; // dev sans Caddy
  const route = {
    match: [{ host: [domain] }],
    handle: [{ handler: 'reverse_proxy', upstreams: [{ dial: 'render:3001' }] }],
    terminal: true,
  };
  await fetch(`${caddyUrl}/config/apps/http/servers/srv0/routes/...`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(route),
  });
  await platformDb.customDomain.updateMany({
    where: { domain },
    data: { certIssued: true },
  });
}
