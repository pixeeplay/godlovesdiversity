/**
 * contact-validators — vérifie que les contacts extraits sont valides.
 *
 *   - validateEmailMx(email)   → MX record check via DNS (Node natif)
 *   - validatePhone(phone)     → libphonenumber-js valide
 *   - emailQualityScore(email) → 0-100 (0 = mauvais, 100 = pro vérifié)
 *
 * Tout est local, gratuit, sans API tierce.
 */

import { promises as dns } from 'dns';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type EmailValidation = {
  email: string;
  valid: boolean;
  hasMx: boolean;
  mxHosts: string[];
  isFreeProvider: boolean;
  isDisposable: boolean;
  isRoleAccount: boolean;        // info@, contact@, etc.
  score: number;                  // 0-100
  reason?: string;
};

const FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.fr', 'hotmail.com', 'hotmail.fr',
  'outlook.com', 'outlook.fr', 'live.com', 'live.fr', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me', 'mail.com', 'gmx.com', 'gmx.fr',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'numericable.fr',
  'voila.fr', 'caramail.com'
]);

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'throwaway.email',
  'mailcatch.com', 'getnada.com', 'temp-mail.org', 'inboxalias.com',
  'maildrop.cc', 'mintemail.com', 'mohmal.com'
]);

const ROLE_LOCALS = new Set([
  'info', 'contact', 'admin', 'support', 'help', 'service', 'sales',
  'office', 'team', 'hello', 'staff', 'webmaster', 'postmaster', 'noreply',
  'no-reply', 'donotreply', 'mailer-daemon', 'abuse', 'security', 'press',
  'media', 'jobs', 'careers', 'rh', 'hr', 'marketing', 'newsletter'
]);

const MX_CACHE = new Map<string, { result: EmailValidation; expiresAt: number }>();
const MX_TTL_MS = 60 * 60 * 1000; // 1h

/**
 * Vérifie qu'un email a un domaine avec des MX records.
 * Cache 1h pour éviter les requêtes DNS répétées.
 */
export async function validateEmailMx(email: string): Promise<EmailValidation> {
  const cleaned = email.trim().toLowerCase();
  const m = cleaned.match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m) {
    return {
      email: cleaned, valid: false, hasMx: false, mxHosts: [],
      isFreeProvider: false, isDisposable: false, isRoleAccount: false,
      score: 0, reason: 'format invalide'
    };
  }
  const local = m[1];
  const domain = m[2];

  // Cache
  const cached = MX_CACHE.get(cleaned);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  const isFreeProvider = FREE_PROVIDERS.has(domain);
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  const isRoleAccount = ROLE_LOCALS.has(local);

  let hasMx = false;
  let mxHosts: string[] = [];
  let reason: string | undefined;

  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length > 0) {
      hasMx = true;
      mxHosts = mx.sort((a, b) => a.priority - b.priority).slice(0, 3).map((r) => r.exchange);
    } else {
      reason = 'pas de MX record';
    }
  } catch (e: any) {
    reason = `DNS: ${e?.code || e?.message || 'KO'}`;
  }

  // Score 0-100
  let score = 0;
  if (hasMx) score += 50;
  if (!isDisposable) score += 20;
  if (!isRoleAccount) score += 15;
  if (!isFreeProvider) score += 15; // domaine pro = bonus
  if (isDisposable) score = Math.min(score, 10);

  const result: EmailValidation = {
    email: cleaned,
    valid: hasMx && !isDisposable,
    hasMx,
    mxHosts,
    isFreeProvider,
    isDisposable,
    isRoleAccount,
    score,
    reason
  };

  MX_CACHE.set(cleaned, { result, expiresAt: Date.now() + MX_TTL_MS });
  return result;
}

/** Validation rapide (format) sans MX check — utile pour le filtre amont. */
export function isPlausibleEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length < 6 || email.length > 254) return false;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false;
  const domain = email.split('@')[1].toLowerCase();
  return !domain.endsWith('.png') && !domain.endsWith('.jpg') && !domain.endsWith('.gif');
}

/* ─── PHONES ─────────────────────────────────────────────────── */

export type PhoneValidation = {
  raw: string;
  valid: boolean;
  e164?: string;
  country?: string;
  type?: string;          // mobile | fixed-line | voip | premium-rate | toll-free
  formatted?: string;
  isMobile: boolean;
  reason?: string;
};

export function validatePhone(input: string, defaultCountry: CountryCode = 'FR'): PhoneValidation {
  try {
    const parsed = parsePhoneNumberFromString(input, defaultCountry);
    if (!parsed) return { raw: input, valid: false, isMobile: false, reason: 'format inconnu' };
    if (!parsed.isValid()) return { raw: input, valid: false, isMobile: false, reason: 'invalide' };
    const type = parsed.getType();
    return {
      raw: input,
      valid: true,
      e164: parsed.format('E.164'),
      country: parsed.country,
      type: type || undefined,
      formatted: parsed.formatInternational(),
      isMobile: type === 'MOBILE'
    };
  } catch (e: any) {
    return { raw: input, valid: false, isMobile: false, reason: e?.message || 'KO' };
  }
}

/* ─── EMAIL QUALITY SCORE (sans DNS) ─────────────────────────── */

export function emailQualityScore(email: string): number {
  const cleaned = email.toLowerCase();
  if (!isPlausibleEmail(cleaned)) return 0;
  const [local, domain] = cleaned.split('@');

  let score = 50; // base
  if (DISPOSABLE_DOMAINS.has(domain)) return 5;
  if (FREE_PROVIDERS.has(domain)) score -= 10;
  if (ROLE_LOCALS.has(local)) score -= 5;
  if (local.length < 3) score -= 15;
  if (local.includes('+')) score -= 10; // alias
  if (/^[a-z]+\.[a-z]+$/.test(local)) score += 15; // prenom.nom = pro
  if (/^[a-z]+@/.test(cleaned) && !FREE_PROVIDERS.has(domain)) score += 10;

  return Math.max(0, Math.min(100, score));
}

/* ─── BULK VALIDATION ───────────────────────────────────────── */

/**
 * Valide en parallèle une liste d'emails (limite 10 concurrents).
 * Retourne par email avec son MX result.
 */
export async function validateEmailsBulk(emails: string[]): Promise<EmailValidation[]> {
  const results: EmailValidation[] = [];
  const concurrency = 10;
  const queue = [...emails];

  async function worker() {
    while (queue.length > 0) {
      const email = queue.shift();
      if (!email) break;
      try {
        const r = await validateEmailMx(email);
        results.push(r);
      } catch {
        results.push({
          email, valid: false, hasMx: false, mxHosts: [],
          isFreeProvider: false, isDisposable: false, isRoleAccount: false,
          score: 0, reason: 'crash'
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
