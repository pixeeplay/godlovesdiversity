import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret, getPlatformSecret } from '@/lib/secrets';
import { getTenantPrisma } from '@pixeesite/database';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/media/upload  (multipart/form-data, field: "file")
 *
 * Stratégie de stockage :
 *   1. S3-compatible si S3_ENDPOINT/MINIO_* + S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET dispo
 *      via PUT signé. (TODO: signature AWS S3 v4 complète — pour l'instant on log et fallback.)
 *   2. Fallback local : écrit dans /public/uploads/<orgSlug>/<filename> et renvoie /uploads/<orgSlug>/...
 *
 * Crée une row Asset dans la DB tenant.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'multipart-required' }, { status: 400 });
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file-required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 6);
  const filename = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
  const mimeType = file.type || (ext === 'mp4' ? 'video/mp4' : ext === 'gif' ? 'image/gif' : `image/${ext}`);

  let publicUrl: string | null = null;
  let bucket = 'local';

  // ─── Stratégie S3 / MinIO (best-effort) ──────────
  const s3Endpoint = await getOrgSecret(orgId, 'S3_ENDPOINT')
    || await getPlatformSecret('S3_ENDPOINT')
    || await getPlatformSecret('MINIO_ENDPOINT');
  const s3Bucket = await getOrgSecret(orgId, 'S3_BUCKET') || `tenant-${slug}`;
  const s3AccessKey = await getOrgSecret(orgId, 'S3_ACCESS_KEY')
    || await getPlatformSecret('S3_ACCESS_KEY')
    || await getPlatformSecret('MINIO_ROOT_USER');
  const s3Secret = await getOrgSecret(orgId, 'S3_SECRET_KEY')
    || await getPlatformSecret('S3_SECRET_KEY')
    || await getPlatformSecret('MINIO_ROOT_PASSWORD');

  if (s3Endpoint && s3AccessKey && s3Secret) {
    // TODO Phase suivante: implémenter signature AWS v4 ou utiliser @aws-sdk/client-s3.
    // Pour l'instant on log et on fallback local pour rester compatible dev.
    console.warn('[media/upload] S3 endpoint detected (' + s3Endpoint + ') — TODO signature, fallback local');
  }

  // ─── Fallback local filesystem ───────────────────
  if (!publicUrl) {
    try {
      const dir = path.join(process.cwd(), 'public', 'uploads', slug);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), buf);
      publicUrl = `/uploads/${slug}/${filename}`;
      bucket = 'local-fs';
    } catch (e: any) {
      return NextResponse.json({ error: 'fs-write-failed: ' + e?.message }, { status: 500 });
    }
  }

  // ─── Crée Asset ──────────────────────────────────
  try {
    const tenantDb = await getTenantPrisma(slug);
    const asset = await tenantDb.asset.create({
      data: {
        bucket,
        key: `uploads/${slug}/${filename}`,
        url: publicUrl,
        filename: file.name.slice(0, 120),
        mimeType,
        sizeBytes: buf.length,
        folder: 'uploads',
        tags: ['upload', mimeType.split('/')[0] || 'file'],
      },
    });
    return NextResponse.json({ ok: true, asset, url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: true, url: publicUrl, warning: 'asset-row-failed:' + (e?.message || 'err') });
  }
}
