import * as Minio from 'minio';

const endpointUrl = new URL(process.env.S3_ENDPOINT || 'http://minio:9000');

// Defaults alignés sur docker-compose.yml (MINIO_ROOT_USER/PASSWORD + bucket parislgbt)
// Override via env vars Coolify : S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET
export const minioClient = new Minio.Client({
  endPoint: endpointUrl.hostname,
  port: Number(endpointUrl.port) || (endpointUrl.protocol === 'https:' ? 443 : 80),
  useSSL: endpointUrl.protocol === 'https:',
  accessKey: process.env.S3_ACCESS_KEY || 'lgbtminio',
  secretKey: process.env.S3_SECRET_KEY || 'lgbtminio-secret'
});

export const BUCKET = process.env.S3_BUCKET || 'parislgbt';

/**
 * URL d'une ressource pour le navigateur.
 * On utilise systématiquement le proxy `/api/storage/...` qui marche
 * partout (local + prod Coolify) sans exposer MinIO publiquement.
 * Si tu configures un CDN (Cloudflare R2, etc.), set S3_PUBLIC_ENDPOINT pour bypass.
 */
export function publicUrl(key: string) {
  if (process.env.S3_PUBLIC_ENDPOINT && process.env.S3_PUBLIC_ENDPOINT !== process.env.S3_ENDPOINT) {
    return `${process.env.S3_PUBLIC_ENDPOINT}/${BUCKET}/${key}`;
  }
  return `/api/storage/${key}`;
}

export async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) await minioClient.makeBucket(BUCKET);
  } catch (e) {
    console.warn('MinIO bucket check failed:', e);
  }
}

export async function uploadBuffer(key: string, buffer: Buffer, mime: string) {
  await ensureBucket();
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': mime
  });
  return publicUrl(key);
}
