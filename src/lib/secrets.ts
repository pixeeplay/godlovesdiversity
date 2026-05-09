/**
 * getSecret() — récupère une valeur de configuration depuis :
 *   1. process.env (Coolify env vars — prioritaire)
 *   2. table Setting avec préfixe "secret." (gérée depuis /admin/secrets)
 *
 * À utiliser à la place de process.env directement quand on veut permettre
 * la configuration via l'admin UI.
 *
 * Exemple :
 *   const apiKey = await getSecret('ANTHROPIC_API_KEY');
 */
import { prisma } from './prisma';

const cache = new Map<string, { value: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30s

export async function getSecret(key: string): Promise<string | null> {
  // 1. env (toujours prioritaire)
  if (process.env[key]) return process.env[key] as string;

  // 2. cache
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value;

  // 3. DB Setting
  try {
    const row = await prisma.setting.findUnique({
      where: { key: `secret.${key}` },
      select: { value: true }
    });
    const value = row?.value || null;
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch {
    return null;
  }
}

/** Invalidate le cache (à appeler après PUT depuis /admin/secrets) */
export function clearSecretsCache() {
  cache.clear();
}

/** Récupère plusieurs secrets en un seul appel DB. */
export async function getSecrets(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  const fromDB: string[] = [];

  for (const k of keys) {
    if (process.env[k]) {
      result[k] = process.env[k] as string;
    } else {
      const hit = cache.get(k);
      if (hit && Date.now() < hit.expiresAt) {
        result[k] = hit.value;
      } else {
        fromDB.push(k);
      }
    }
  }

  if (fromDB.length > 0) {
    try {
      const rows = await prisma.setting.findMany({
        where: { key: { in: fromDB.map((k) => `secret.${k}`) } },
        select: { key: true, value: true }
      });
      const map = new Map(rows.map((r) => [r.key.replace('secret.', ''), r.value]));
      for (const k of fromDB) {
        const v = map.get(k) || null;
        result[k] = v;
        cache.set(k, { value: v, expiresAt: Date.now() + CACHE_TTL_MS });
      }
    } catch {
      for (const k of fromDB) result[k] = null;
    }
  }

  return result;
}
