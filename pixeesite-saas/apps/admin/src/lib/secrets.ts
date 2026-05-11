import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { platformDb } from '@pixeesite/database';

/**
 * AES-256-GCM encryption for secrets.
 * MASTER_KEY env var is used (sha256-derived to 32 bytes).
 * Storage format: base64(iv):base64(authTag):base64(ciphertext)
 */

function getKey(): Buffer {
  const k = process.env.MASTER_KEY || process.env.NEXTAUTH_SECRET;
  if (!k) throw new Error('MASTER_KEY or NEXTAUTH_SECRET must be set for secret encryption');
  return createHash('sha256').update(k).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  if (!stored) return '';
  try {
    const [ivB64, tagB64, dataB64] = stored.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

/** Mask all but last 4 chars of a secret for display. */
export function maskSecret(plain: string): string {
  if (!plain) return '';
  if (plain.length <= 8) return '••••';
  return '•'.repeat(Math.min(plain.length - 4, 12)) + plain.slice(-4);
}

/** Get a platform secret by key, decrypted. */
export async function getPlatformSecret(key: string): Promise<string | null> {
  // Fall back to env var first (for bootstrap)
  if (process.env[key]) return process.env[key]!;
  const row = await platformDb.platformSecret.findUnique({ where: { key } }).catch(() => null);
  if (!row || !row.active) return null;
  return decryptSecret(row.value) || null;
}

/** Get an org secret by key, decrypted. */
export async function getOrgSecret(orgId: string, key: string): Promise<string | null> {
  const row = await platformDb.orgSecret.findUnique({ where: { orgId_key: { orgId, key } } }).catch(() => null);
  if (!row || !row.active) {
    // Fallback to platform-level secret
    return getPlatformSecret(key);
  }
  return decryptSecret(row.value) || null;
}
