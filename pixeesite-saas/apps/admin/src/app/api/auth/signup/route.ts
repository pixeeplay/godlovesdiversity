import { NextRequest, NextResponse } from 'next/server';
import { platformDb, provisionTenantDb } from '@pixeesite/database';
import { hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/auth/signup
 * Body: { email, password, orgSlug, orgName }
 *
 * Crée User + Org + OrgMember(role=owner) + provisionne la DB tenant.
 * Retourne 201 si OK pour permettre login direct côté client.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email as string)?.trim().toLowerCase();
  const password = body.password as string;
  const orgSlug = (body.orgSlug as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const orgName = (body.orgName as string)?.trim() || orgSlug;

  if (!email || !password || !orgSlug) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password-too-short' }, { status: 400 });
  }
  if (orgSlug.length < 3 || orgSlug.length > 40) {
    return NextResponse.json({ error: 'invalid-slug' }, { status: 400 });
  }
  if (['admin', 'app', 'api', 'render', 'www', 'mail', 'pixeesite', 'pixeeplay'].includes(orgSlug)) {
    return NextResponse.json({ error: 'reserved-slug' }, { status: 400 });
  }

  // Vérif unicité
  const existingOrg = await platformDb.org.findUnique({ where: { slug: orgSlug } });
  if (existingOrg) return NextResponse.json({ error: 'slug-taken' }, { status: 409 });

  let user = await platformDb.user.findUnique({ where: { email } });
  if (user && user.passwordHash) {
    return NextResponse.json({ error: 'email-already-used' }, { status: 409 });
  }

  // Crée user (upsert si OAuth déjà en place sans password)
  if (!user) {
    user = await platformDb.user.create({
      data: { email, passwordHash: await hashPassword(password), name: email.split('@')[0] },
    });
  } else {
    user = await platformDb.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  }

  // Crée org + membership owner
  const org = await platformDb.org.create({
    data: {
      slug: orgSlug,
      name: orgName,
      ownerId: user.id,
      plan: 'free',
      planStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 jours
      defaultDomain: `${orgSlug}.pixeesite.app`,
      tenantBucket: `tenant-${orgSlug}`,
      members: { create: { userId: user.id, role: 'owner', acceptedAt: new Date() } },
    },
  });

  // Provisionne la DB tenant en background (non-bloquant pour la réponse)
  void provisionTenantDb(orgSlug).catch((e) => {
    console.error(`[signup] tenant provisioning failed for ${orgSlug}`, e);
  });

  // Audit
  await platformDb.platformAuditLog.create({
    data: {
      userId: user.id,
      orgId: org.id,
      action: 'org.create',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0],
      userAgent: req.headers.get('user-agent'),
    },
  });

  return NextResponse.json({ ok: true, orgSlug: org.slug, userId: user.id }, { status: 201 });
}
