import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  const src = await db.product.findUnique({ where: { id } });
  if (!src) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // Trouve un slug unique
  let newSlug = `${src.slug}-copie`;
  let n = 2;
  while (await db.product.findUnique({ where: { slug: newSlug } })) {
    newSlug = `${src.slug}-copie-${n++}`;
    if (n > 30) return NextResponse.json({ error: 'slug-collision' }, { status: 409 });
  }
  const { id: _, createdAt, updatedAt, ...data } = src as any;
  const dup = await db.product.create({
    data: {
      ...data,
      slug: newSlug,
      name: `${src.name} (copie)`,
      active: false,
    },
  });
  return NextResponse.json({ ok: true, product: dup });
}
