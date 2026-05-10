/**
 * contact-detectors — extrait emails, téléphones, WhatsApp, handles sociaux
 * depuis du texte brut ou du HTML.
 *
 * Utilisable depuis tous les adapters de scraping (web, LinkedIn, Insta, etc.).
 *
 * Approche défensive :
 *   - Désobfusque les patterns courants (`name [at] domain`, Cloudflare email-protected)
 *   - Filtre les faux positifs connus (noreply, sentry, gravatar, fonts)
 *   - Normalise tous les téléphones en E.164 via libphonenumber-js
 *   - Déduplique les résultats
 */

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type ExtractedEmail = {
  email: string;
  context?: string;       // 50 chars autour pour debug
  source?: string;
};

export type ExtractedPhone = {
  e164: string;           // +33612345678
  country: string | null; // FR, US…
  type: string | null;    // mobile | fixed-line | voip
  formatted: string;      // "+33 6 12 34 56 78"
  raw: string;            // ce qu'on a trouvé dans le texte
};

export type ExtractedWhatsApp = {
  e164: string;
  link: string;           // wa.me/...
  formatted: string;
};

export type ExtractedHandles = {
  linkedin?: string;       // /in/<handle>
  linkedinCompany?: string; // /company/<slug>
  instagram?: string;
  twitter?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  pinterest?: string;
};

/* ─── EMAILS ─────────────────────────────────────────────────── */

const EMAIL_RE = /([a-z0-9._%+-]+)@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)/gi;

const EMAIL_BLACKLIST_LOCAL = new Set([
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'postmaster',
  'mailer-daemon', 'admin', 'webmaster', 'support', 'info', 'hello',
  'contact', 'office', 'office@', 'service', 'team', 'help'
]);

const EMAIL_BLACKLIST_DOMAINS = new Set([
  'sentry.io', 'sentry-next.wixpress.com', 'gravatar.com', 'mixpanel.com',
  'segment.com', 'fullstory.com', 'hotjar.com', 'datadoghq.com', 'newrelic.com',
  'fonts.gstatic.com', 'wp.com', 'cloudflare.com', 'jsdelivr.net',
  'example.com', 'example.org', 'example.net', 'test.com', 'localhost',
  'sample.com', 'domain.com', 'yourdomain.com', 'company.com'
]);

/** Décode email obfusqué Cloudflare email-protection (data-cfemail="...") */
function decodeCfEmail(hexCode: string): string | null {
  try {
    const r = parseInt(hexCode.substring(0, 2), 16);
    let result = '';
    for (let i = 2; i < hexCode.length; i += 2) {
      result += String.fromCharCode(parseInt(hexCode.substring(i, i + 2), 16) ^ r);
    }
    return result;
  } catch {
    return null;
  }
}

/** Désobfusque les patterns courants : `name [at] domain [dot] com`, `name (at) domain` */
function deobfuscateEmails(text: string): string {
  return text
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
    .replace(/&commat;/gi, '@')
    .replace(/&#64;/gi, '@')
    .replace(/&#46;/gi, '.');
}

/** Décode tous les emails Cloudflare protected dans un HTML */
function decodeCfEmailsInHtml(html: string): string {
  // <a class="__cf_email__" data-cfemail="abc123...">[email protected]</a>
  return html.replace(/data-cfemail="([a-f0-9]+)"/gi, (m, hex) => {
    const decoded = decodeCfEmail(hex);
    return decoded ? `data-cfemail-decoded="${decoded}"` : m;
  });
}

export function extractEmails(input: string, opts: { source?: string } = {}): ExtractedEmail[] {
  const text = decodeCfEmailsInHtml(deobfuscateEmails(input));
  const found = new Map<string, ExtractedEmail>();

  let match: RegExpExecArray | null;
  EMAIL_RE.lastIndex = 0;
  while ((match = EMAIL_RE.exec(text)) !== null) {
    const email = match[0].toLowerCase();
    const local = match[1].toLowerCase();
    const domain = match[2].toLowerCase();

    // Filtres anti-faux-positifs
    if (EMAIL_BLACKLIST_DOMAINS.has(domain)) continue;
    if (domain.startsWith('lh') && domain.endsWith('.googleusercontent.com')) continue;
    if (domain.endsWith('.png') || domain.endsWith('.jpg') || domain.endsWith('.gif') ||
        domain.endsWith('.svg') || domain.endsWith('.webp') || domain.endsWith('.ico')) continue;
    if (local.length < 2) continue;
    if (email.length > 254) continue;

    // Garde mais marque les locaux génériques (info@, contact@) — c'est OK pour B2B
    const isGeneric = EMAIL_BLACKLIST_LOCAL.has(local);

    if (!found.has(email)) {
      const idx = match.index;
      const context = text.slice(Math.max(0, idx - 30), Math.min(text.length, idx + email.length + 30));
      found.set(email, {
        email,
        context: context.replace(/\s+/g, ' ').trim(),
        source: opts.source
      });
    }
  }

  return Array.from(found.values());
}

/* ─── PHONES ─────────────────────────────────────────────────── */

// Pattern large : capture séquences potentiellement téléphoniques
const PHONE_RE = /(?:\+|00)?\s?\d[\d\s.\-()]{7,}\d/g;

export function extractPhones(
  input: string,
  defaultCountry: CountryCode = 'FR'
): ExtractedPhone[] {
  const found = new Map<string, ExtractedPhone>();
  const text = input;

  let match: RegExpExecArray | null;
  PHONE_RE.lastIndex = 0;
  while ((match = PHONE_RE.exec(text)) !== null) {
    const raw = match[0].trim();
    if (raw.replace(/\D/g, '').length < 8) continue;
    if (raw.replace(/\D/g, '').length > 15) continue;

    try {
      const parsed = parsePhoneNumberFromString(raw, defaultCountry);
      if (!parsed?.isValid()) continue;
      const e164 = parsed.format('E.164');
      if (found.has(e164)) continue;

      // Ignore des trucs trop courts (numéros internes) ou test (911, 411…)
      if (e164.length < 9) continue;

      found.set(e164, {
        e164,
        country: parsed.country || null,
        type: parsed.getType() || null,
        formatted: parsed.formatInternational(),
        raw
      });
    } catch {
      // skip — pas un numéro valide
    }
  }

  return Array.from(found.values());
}

/* ─── WHATSAPP ──────────────────────────────────────────────── */

export function extractWhatsApp(input: string, defaultCountry: CountryCode = 'FR'): ExtractedWhatsApp[] {
  const found = new Map<string, ExtractedWhatsApp>();

  // 1. Liens wa.me / api.whatsapp.com / whatsapp://
  const linkRe = /(?:wa\.me|api\.whatsapp\.com\/send|whatsapp:\/\/send)[/?]\??(?:phone=)?(\+?\d{8,15})/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(input)) !== null) {
    const num = m[1];
    try {
      const parsed = parsePhoneNumberFromString(num.startsWith('+') ? num : `+${num}`, defaultCountry);
      if (parsed?.isValid()) {
        const e164 = parsed.format('E.164');
        if (!found.has(e164)) {
          found.set(e164, {
            e164,
            link: `https://wa.me/${e164.slice(1)}`,
            formatted: parsed.formatInternational()
          });
        }
      }
    } catch {}
  }

  // 2. Mentions textuelles « WhatsApp +33 6 ... » (regex qui exige le mot WhatsApp à proximité)
  const mentionRe = /whats?app\s*:?\s*((?:\+|00)?\s?\d[\d\s.\-()]{7,}\d)/gi;
  while ((m = mentionRe.exec(input)) !== null) {
    try {
      const parsed = parsePhoneNumberFromString(m[1], defaultCountry);
      if (parsed?.isValid()) {
        const e164 = parsed.format('E.164');
        if (!found.has(e164)) {
          found.set(e164, {
            e164,
            link: `https://wa.me/${e164.slice(1)}`,
            formatted: parsed.formatInternational()
          });
        }
      }
    } catch {}
  }

  return Array.from(found.values());
}

/* ─── SOCIAL HANDLES ────────────────────────────────────────── */

export function extractHandles(input: string): ExtractedHandles {
  const out: ExtractedHandles = {};

  // LinkedIn
  const li = input.match(/linkedin\.com\/in\/([a-z0-9-_%.]+)/i);
  if (li) out.linkedin = li[1].replace(/[/]+$/, '');
  const liCo = input.match(/linkedin\.com\/company\/([a-z0-9-_%.]+)/i);
  if (liCo) out.linkedinCompany = liCo[1].replace(/[/]+$/, '');

  // Instagram (insta.com OU instagram.com OU @handle dans le texte)
  const ig = input.match(/instagram\.com\/([a-z0-9._]+)/i);
  if (ig) out.instagram = ig[1].replace(/[/]+$/, '');
  if (!out.instagram) {
    const igAt = input.match(/(?:^|\s|>)@([a-z0-9._]{3,30})(?=\s|$|<)/i);
    if (igAt) out.instagram = igAt[1];
  }

  // Twitter / X
  const tw = input.match(/(?:twitter\.com|x\.com)\/([a-z0-9_]+)/i);
  if (tw && !['intent', 'share', 'home', 'i', 'login', 'signup'].includes(tw[1].toLowerCase())) {
    out.twitter = tw[1].replace(/[/]+$/, '');
  }

  // Facebook
  const fb = input.match(/facebook\.com\/(?!sharer|tr)([a-z0-9.\-_]+)/i);
  if (fb && !['watch', 'pages', 'groups', 'events'].includes(fb[1].toLowerCase())) {
    out.facebook = fb[1].replace(/[/]+$/, '');
  }

  // TikTok
  const tt = input.match(/tiktok\.com\/@([a-z0-9._]+)/i);
  if (tt) out.tiktok = tt[1];

  // YouTube
  const yt = input.match(/youtube\.com\/(?:c\/|channel\/|@)([a-z0-9._-]+)/i);
  if (yt) out.youtube = yt[1].replace(/[/]+$/, '');

  // Pinterest
  const pt = input.match(/pinterest\.[a-z.]+\/([a-z0-9._-]+)/i);
  if (pt && !['pin', 'search', 'today', 'discover'].includes(pt[1].toLowerCase())) {
    out.pinterest = pt[1].replace(/[/]+$/, '');
  }

  return out;
}

/* ─── EXTRACTION COMPLÈTE ───────────────────────────────────── */

export type ExtractedContacts = {
  emails: ExtractedEmail[];
  phones: ExtractedPhone[];
  whatsapps: ExtractedWhatsApp[];
  handles: ExtractedHandles;
};

export function extractAllContacts(
  input: string,
  opts: { defaultCountry?: CountryCode; source?: string } = {}
): ExtractedContacts {
  const defaultCountry = opts.defaultCountry || 'FR';
  return {
    emails: extractEmails(input, { source: opts.source }),
    phones: extractPhones(input, defaultCountry),
    whatsapps: extractWhatsApp(input, defaultCountry),
    handles: extractHandles(input)
  };
}

/* ─── DÉDUPLICATION ─────────────────────────────────────────── */

export type CanonicalContact = {
  email?: string;
  phoneE164?: string;
  whatsappE164?: string;
  handles: ExtractedHandles;
  sources: string[];
};

/** Fusionne plusieurs ExtractedContacts en une liste canonique dédoublonnée. */
export function dedupeContacts(extractions: ExtractedContacts[]): CanonicalContact[] {
  const byEmail = new Map<string, CanonicalContact>();
  const byPhone = new Map<string, CanonicalContact>();
  const orphans: CanonicalContact[] = [];

  for (const e of extractions) {
    // Pour chaque email, on crée/merge un contact
    for (const em of e.emails) {
      const key = em.email;
      const existing = byEmail.get(key);
      if (existing) {
        if (em.source && !existing.sources.includes(em.source)) existing.sources.push(em.source);
        Object.assign(existing.handles, e.handles);
        if (e.phones[0]) existing.phoneE164 = existing.phoneE164 || e.phones[0].e164;
      } else {
        byEmail.set(key, {
          email: key,
          phoneE164: e.phones[0]?.e164,
          whatsappE164: e.whatsapps[0]?.e164,
          handles: { ...e.handles },
          sources: em.source ? [em.source] : []
        });
      }
    }

    // Téléphones sans email associé
    if (e.emails.length === 0 && e.phones.length > 0) {
      for (const p of e.phones) {
        const key = p.e164;
        if (byPhone.has(key)) {
          const ex = byPhone.get(key)!;
          Object.assign(ex.handles, e.handles);
        } else {
          byPhone.set(key, {
            phoneE164: key,
            whatsappE164: e.whatsapps[0]?.e164,
            handles: { ...e.handles },
            sources: []
          });
        }
      }
    }

    // Handles seuls (pas d'email ni phone)
    if (e.emails.length === 0 && e.phones.length === 0 && Object.keys(e.handles).length > 0) {
      orphans.push({
        handles: { ...e.handles },
        sources: []
      });
    }
  }

  return [...byEmail.values(), ...byPhone.values(), ...orphans];
}
