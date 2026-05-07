/**
 * TOTP (RFC 6238) implementation native — sans otplib.
 * Compatible Google Authenticator, Microsoft Authenticator, Authy, 1Password.
 *
 * Algorithme :
 *  1. Convertit le secret base32 en bytes
 *  2. HMAC-SHA1(secret, counter = floor(timestamp/30))
 *  3. Dynamic truncation → 6 digits
 *
 * Vérifie sur 1 step avant et 1 step après pour tolérer la dérive d'horloge.
 */

import crypto from 'node:crypto';

// Base32 RFC 4648 alphabet
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(bytes = 20): string {
  // 20 bytes = 160 bits, recommandé RFC 6238
  const buf = crypto.randomBytes(bytes);
  return base32Encode(buf);
}

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

export function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const i = B32_ALPHABET.indexOf(c);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/**
 * Génère un code TOTP 6-digits pour un secret donné.
 */
export function totpCode(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(counter, 4);

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

/**
 * Vérifie qu'un code matche, avec tolérance ±1 step (30s).
 */
export function totpVerify(secret: string, code: string): boolean {
  const cleanCode = code.replace(/\D/g, '');
  if (cleanCode.length !== 6) return false;
  const now = Date.now();
  for (const offset of [-1, 0, 1]) {
    if (totpCode(secret, now + offset * 30_000) === cleanCode) return true;
  }
  return false;
}

/**
 * Génère l'URL otpauth:// pour le QR code (compatible tous Authenticators).
 */
export function totpUri(secret: string, accountName: string, issuer = 'GLD Admin'): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params}`;
}

/**
 * Génère 10 codes de récupération aléatoires (non hashés — caller doit les hasher).
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buf = crypto.randomBytes(5);
    let code = '';
    for (let j = 0; j < buf.length; j++) {
      code += String(buf[j]).slice(0, 1);
    }
    // Format XXXX-XXXX
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}
