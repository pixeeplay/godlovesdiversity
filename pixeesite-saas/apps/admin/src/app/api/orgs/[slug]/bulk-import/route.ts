import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTITY_MAP: Record<string, { model: string; required: string[]; }> = {
  products: { model: 'product', required: ['name', 'priceCents'] },
  articles: { model: 'article', required: ['title'] },
  leads:    { model: 'lead',    required: ['email'] },
  events:   { model: 'event',   required: ['title', 'startsAt'] },
};

function slugify(s: string) {
  return (s || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const entity = (b.entity || '').toLowerCase();
  const rows = Array.isArray(b.rows) ? b.rows : [];
  const dryRun = !!b.dryRun;
  const mapping = ENTITY_MAP[entity];
  if (!mapping) return NextResponse.json({ error: `unknown entity: ${entity}. Supported: ${Object.keys(ENTITY_MAP).join(', ')}` }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ error: 'no rows' }, { status: 400 });

  // Validation
  const errors: { row: number; reason: string }[] = [];
  const valid: any[] = [];
  rows.forEach((row: any, i: number) => {
    for (const k of mapping.required) {
      if (row[k] == null || row[k] === '') {
        errors.push({ row: i, reason: `missing required field: ${k}` });
        return;
      }
    }
    valid.push(row);
  });

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, total: rows.length, valid: valid.length, errors });
  }

  const db = await getTenantPrisma(slug);
  let inserted = 0;
  const insertErrors: { row: number; reason: string }[] = [];
  for (let i = 0; i < valid.length; i++) {
    const row = valid[i];
    try {
      if (entity === 'products') {
        await (db as any).product.create({ data: {
          slug: row.slug || slugify(row.name),
          name: row.name,
          description: row.description || null,
          priceCents: Number(row.priceCents) || 0,
          currency: row.currency || 'EUR',
          inventory: Number(row.inventory) || 0,
          category: row.category || null,
          images: Array.isArray(row.images) ? row.images : [],
          active: row.active !== false,
        }});
      } else if (entity === 'articles') {
        await (db as any).article.create({ data: {
          slug: row.slug || slugify(row.title),
          title: row.title,
          excerpt: row.excerpt || null,
          bodyHtml: row.bodyHtml || row.body || null,
          coverImage: row.coverImage || null,
          status: row.status || 'draft',
          tags: Array.isArray(row.tags) ? row.tags : [],
        }});
      } else if (entity === 'leads') {
        await (db as any).lead.create({ data: {
          email: row.email,
          firstName: row.firstName || null,
          lastName: row.lastName || null,
          phone: row.phone || null,
          city: row.city || null,
          country: row.country || null,
          source: row.source || 'bulk-import',
          tags: Array.isArray(row.tags) ? row.tags : [],
        }});
      } else if (entity === 'events') {
        await (db as any).event.create({ data: {
          slug: slugify(row.title) + '-' + Math.random().toString(36).slice(2, 6),
          title: row.title,
          description: row.description || null,
          startsAt: new Date(row.startsAt),
          endsAt: row.endsAt ? new Date(row.endsAt) : null,
          location: row.location || null,
          category: row.category || null,
          tags: Array.isArray(row.tags) ? row.tags : [],
          published: row.published !== false,
        }});
      }
      inserted++;
    } catch (e: any) {
      insertErrors.push({ row: i, reason: e?.message?.slice(0, 200) || 'insert failed' });
    }
  }

  return NextResponse.json({
    ok: true, total: rows.length, valid: valid.length, inserted,
    errors: [...errors, ...insertErrors],
  });
}
