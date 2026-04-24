import { prisma } from './prisma';

/**
 * Récupère un paramètre depuis la DB, avec fallback sur les variables d'env.
 * Les valeurs DB ont priorité sur l'env (permet d'override depuis le BO).
 */
export async function getSetting(key: string, envFallback?: string): Promise<string | undefined> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch { /* DB pas prête */ }
  if (envFallback) return process.env[envFallback];
  return undefined;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

/** Liste des clés sensibles à masquer dans l'UI */
export const SENSITIVE_KEYS = new Set([
  'integrations.gemini.apiKey',
  'integrations.resend.apiKey',
  'integrations.meta.appSecret',
  'integrations.meta.pageAccessToken',
  'integrations.x.apiSecret',
  'integrations.x.accessTokenSecret',
  'integrations.linkedin.clientSecret',
  'integrations.tiktok.clientSecret'
]);

export function maskValue(v: string) {
  if (!v) return '';
  if (v.length <= 8) return '••••';
  return v.slice(0, 4) + '••••' + v.slice(-4);
}

/** Récupère TOUS les settings, mappés en objet — utile pour les pages publiques */
export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}
