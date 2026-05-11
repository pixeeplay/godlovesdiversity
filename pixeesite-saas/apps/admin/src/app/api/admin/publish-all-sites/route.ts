import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireSuperAdmin } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/publish-all-sites?org=<slug>
 *
 * Super-admin only. Met TOUS les sites de l'org en status='published'
 * (utile après la modification du wizard qui crée maintenant en published direct,
 * pour rattraper les anciens sites créés en draft).
 *
 * Retourne { ok, org, before, after, updated }
 */
export async function POST(req: NextRequest) {
  try { await requireSuperAdmin(); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  const url = new URL(req.url);
  const orgSlug = url.searchParams.get('org');
  if (!orgSlug) return NextResponse.json({ error: 'org required' }, { status: 400 });

  const org = await platformDb.org.findUnique({ where: { slug: orgSlug }, select: { id: true, defaultDomain: true } });
  if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 });

  const before = await platformDb.site.count({ where: { orgId: org.id, status: 'draft' } });
  const total = await platformDb.site.count({ where: { orgId: org.id } });

  const r = await platformDb.site.updateMany({
    where: { orgId: org.id, status: { not: 'published' } },
    data: { status: 'published', deployedAt: new Date() },
  });

  const after = await platformDb.site.count({ where: { orgId: org.id, status: 'published' } });

  // Migration : si defaultDomain pointe encore vers l'ancien .pixeesite.app, on le bascule sur .pixeeplay.com
  let domainMigrated = false;
  if (org.defaultDomain && org.defaultDomain.endsWith('.pixeesite.app')) {
    await platformDb.org.update({
      where: { id: org.id },
      data: { defaultDomain: `${orgSlug}.pixeeplay.com` },
    });
    domainMigrated = true;
  }

  return NextResponse.json({
    ok: true, org: orgSlug, total, draftsBefore: before, published: after, updated: r.count,
    domainMigrated, newDomain: domainMigrated ? `${orgSlug}.pixeeplay.com` : org.defaultDomain,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
