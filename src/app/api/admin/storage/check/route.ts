/**
 * GET /api/admin/storage/check — Diagnostic MinIO / S3
 *
 * Vérifie tout le pipeline storage et renvoie un rapport détaillé :
 *  - Variables d'env présentes
 *  - Connexion MinIO (listBuckets)
 *  - Existence du bucket configuré
 *  - Test upload + read d'un fichier dummy
 *
 * Permet de diagnostiquer "Upload MinIO échoué" exactement :
 * credentials wrong / bucket missing / network unreachable / DNS broken
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { minioClient, BUCKET, publicUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const report: any = {
    env: {
      S3_ENDPOINT: process.env.S3_ENDPOINT || '(default: http://minio:9000)',
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ? `${process.env.S3_ACCESS_KEY.slice(0, 4)}…` : '(default: lgbtminio)',
      S3_SECRET_KEY: process.env.S3_SECRET_KEY ? '••••••••' : '(default: lgbtminio-secret)',
      S3_BUCKET: process.env.S3_BUCKET || `(default: ${BUCKET})`,
      S3_PUBLIC_ENDPOINT: process.env.S3_PUBLIC_ENDPOINT || '(unset → utilise proxy /api/storage/)',
    },
    resolvedBucket: BUCKET,
    steps: [] as any[]
  };

  // Step 1 : listBuckets (teste auth + network)
  try {
    const buckets = await minioClient.listBuckets();
    report.steps.push({
      step: '1. List buckets',
      ok: true,
      buckets: buckets.map((b) => b.name)
    });
  } catch (e: any) {
    report.steps.push({
      step: '1. List buckets',
      ok: false,
      error: e?.message || String(e),
      hint: detectHint(e)
    });
    return NextResponse.json(report, { status: 503 });
  }

  // Step 2 : bucketExists
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    report.steps.push({
      step: `2. Bucket "${BUCKET}" exists`,
      ok: exists,
      ...(exists ? {} : { warning: 'Bucket absent — tentative de création…' })
    });

    if (!exists) {
      try {
        await minioClient.makeBucket(BUCKET);
        report.steps.push({ step: `2b. Create bucket "${BUCKET}"`, ok: true });
      } catch (e: any) {
        report.steps.push({
          step: `2b. Create bucket "${BUCKET}"`,
          ok: false,
          error: e?.message || String(e),
          hint: 'Les credentials sont valides (listBuckets a marché) mais l\'utilisateur n\'a pas les droits makeBucket. Sur Coolify, lance le service minio-init pour créer le bucket avec mc.'
        });
        return NextResponse.json(report, { status: 503 });
      }
    }
  } catch (e: any) {
    report.steps.push({
      step: `2. Bucket "${BUCKET}" exists`,
      ok: false,
      error: e?.message || String(e)
    });
    return NextResponse.json(report, { status: 503 });
  }

  // Step 3 : Test upload + read
  const testKey = `_test/diag-${Date.now()}.txt`;
  const testContent = Buffer.from(`diag ${new Date().toISOString()}`);
  try {
    await minioClient.putObject(BUCKET, testKey, testContent, testContent.length, { 'Content-Type': 'text/plain' });
    report.steps.push({ step: '3. Upload test object', ok: true, key: testKey });

    // Read back
    const stream = await minioClient.getObject(BUCKET, testKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) chunks.push(chunk as Buffer);
    const readBack = Buffer.concat(chunks).toString();
    report.steps.push({
      step: '4. Read test object',
      ok: readBack === testContent.toString(),
      url: publicUrl(testKey)
    });

    // Cleanup
    await minioClient.removeObject(BUCKET, testKey);
    report.steps.push({ step: '5. Cleanup', ok: true });
  } catch (e: any) {
    report.steps.push({
      step: '3. Upload/read test',
      ok: false,
      error: e?.message || String(e)
    });
    return NextResponse.json(report, { status: 503 });
  }

  report.ok = true;
  report.summary = `✅ Tout fonctionne. Bucket "${BUCKET}" est accessible et upload/read OK.`;
  return NextResponse.json(report);
}

function detectHint(e: any): string {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('econnrefused') || m.includes('econn')) {
    return 'Le service MinIO n\'est pas joignable. Sur Coolify : vérifie que le service minio est UP (Resources → minio → Status). Sur localhost : docker compose up minio.';
  }
  if (m.includes('enotfound') || m.includes('getaddrinfo')) {
    return 'DNS resolution échoue pour le hostname MinIO. Vérifie S3_ENDPOINT (par défaut http://minio:9000 dans Docker network).';
  }
  if (m.includes('invalid accesskeyid') || m.includes('signaturedoesnotmatch') || m.includes('access denied')) {
    return 'Credentials S3_ACCESS_KEY / S3_SECRET_KEY incorrects. Sur Coolify, vérifie les env vars de parislgbt-web vs MINIO_ROOT_USER / MINIO_ROOT_PASSWORD du service minio.';
  }
  if (m.includes('eaccess') || m.includes('eperm')) {
    return 'Problème de permissions.';
  }
  return 'Erreur générique — voir le message complet.';
}
