import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Limite côté serveur : 100 MB (Coolify/Caddy doit aussi le permettre côté reverse proxy)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch (e: any) {
    return NextResponse.json({
      error: 'Body trop volumineux ou invalide. Compresse ta vidéo (max ~100 MB recommandé).',
      detail: e?.message
    }, { status: 413 });
  }

  const files = fd.getAll('files') as File[];
  if (!files.length) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const out: { key: string; url: string; mime: string; name: string; size: number }[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    if (buf.length > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `${f.name} fait ${(buf.length / 1024 / 1024).toFixed(1)} MB. Max ${MAX_FILE_SIZE / 1024 / 1024} MB. Conseil pour vidéo hero : H.264, 720p, 5-10 secondes en boucle, ~5-15 MB.`,
        size: buf.length,
        max: MAX_FILE_SIZE
      }, { status: 413 });
    }
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
    const key = `media/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;
    try {
      await uploadBuffer(key, buf, f.type || 'application/octet-stream');
    } catch (e: any) {
      console.error('MinIO upload failed:', e);
      const detail = e?.message || String(e);
      // Hint contextuel selon le type d'erreur
      let hint = '';
      const m = detail.toLowerCase();
      if (m.includes('econnrefused') || m.includes('econn')) {
        hint = '\n→ Service MinIO indisponible. Coolify → Resources → minio doit être UP.';
      } else if (m.includes('enotfound') || m.includes('getaddrinfo')) {
        hint = '\n→ DNS MinIO injoignable. Vérifie S3_ENDPOINT (par défaut http://minio:9000).';
      } else if (m.includes('invalid accesskeyid') || m.includes('signaturedoesnotmatch') || m.includes('access denied')) {
        hint = '\n→ Credentials invalides. Vérifie S3_ACCESS_KEY / S3_SECRET_KEY sur Coolify vs MINIO_ROOT_USER / MINIO_ROOT_PASSWORD.';
      } else if (m.includes('nosuchbucket')) {
        hint = '\n→ Bucket inexistant. Lance "GET /api/admin/storage/check" pour le créer automatiquement.';
      }
      return NextResponse.json({
        error: `Upload MinIO échoué — ${detail}${hint}\n\n→ Diagnostic complet : GET /api/admin/storage/check`,
        detail,
        hint
      }, { status: 500 });
    }
    out.push({ key, url: publicUrl(key), mime: f.type || '', name: f.name, size: buf.length });
  }
  return NextResponse.json({ ok: true, files: out });
}
