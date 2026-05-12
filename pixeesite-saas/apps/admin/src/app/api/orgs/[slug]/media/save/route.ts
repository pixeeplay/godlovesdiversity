import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/orgs/[slug]/media/save
 * body: { url, type, alt?, source?, author?, sourceUrl?, width?, height? }
 *
 * Sauvegarde un média dans la table Asset du tenant (cache externe + métadonnées).
 * On NE re-télécharge PAS le fichier pour rester léger — on stocke juste l'URL
 * et le credit.
 *
 * Pour un upload réel local → MinIO, voir /api/orgs/[slug]/media/upload.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const url = (body.url as string || '').trim();
  if (!url) return NextResponse.json({ error: 'url-required' }, { status: 400 });

  const type = (body.type as string) || 'photo';
  const source = (body.source as string) || 'external';
  const mimeType = type === 'video' ? 'video/mp4'
    : type === 'gif' ? 'image/gif'
    : type === 'youtube' ? 'video/youtube'
    : 'image/jpeg';

  try {
    const tenantDb = await getTenantPrisma(slug);
    const filename = url.split('/').pop()?.split('?')[0] || `${source}-${Date.now()}`;
    const asset = await tenantDb.asset.create({
      data: {
        bucket: source,
        key: `media-lib/${source}/${filename}`,
        url,
        filename: filename.slice(0, 120),
        mimeType,
        sizeBytes: 0,
        alt: body.alt || null,
        width: Number(body.width) || null,
        height: Number(body.height) || null,
        folder: 'media-library',
        tags: [source, type, ...(body.author ? [`by:${body.author}`] : [])],
        aiGenerated: source === 'ai',
        aiPrompt: source === 'ai' ? (body.alt || null) : null,
      },
    });
    return NextResponse.json({ ok: true, asset });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'db-error' }, { status: 500 });
  }
}

/**
 * GET /api/orgs/[slug]/media/save?folder=&q=
 * Liste les Assets du tenant pour le tab "Mes médias".
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const limit = Math.min(60, Number(req.nextUrl.searchParams.get('limit')) || 30);

  try {
    const tenantDb = await getTenantPrisma(slug);
    const where: any = {};
    if (q) {
      where.OR = [
        { filename: { contains: q, mode: 'insensitive' } },
        { alt: { contains: q, mode: 'insensitive' } },
        { tags: { has: q.toLowerCase() } },
      ];
    }
    const assets = await tenantDb.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return NextResponse.json({ assets });
  } catch (e: any) {
    return NextResponse.json({ assets: [], error: e?.message || 'db-error' });
  }
}

/**
 * DELETE /api/orgs/[slug]/media/save?id=…
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const tenantDb = await getTenantPrisma(slug);
    await tenantDb.asset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'db-error' }, { status: 500 });
  }
}
