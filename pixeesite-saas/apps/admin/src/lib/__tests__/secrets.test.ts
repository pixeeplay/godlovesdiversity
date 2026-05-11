import { describe, it, expect, beforeAll } from 'vitest';
import { encryptSecret, decryptSecret, maskSecret } from '../secrets';

beforeAll(() => {
  process.env.MASTER_KEY = 'test-master-key-do-not-use-in-prod-' + 'x'.repeat(40);
});

describe('secrets', () => {
  it('encrypts and decrypts roundtrip', () => {
    const plain = 'sk_live_supersecret123';
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(enc.split(':').length).toBe(3);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const plain = 'same-input';
    const a = encryptSecret(plain);
    const b = encryptSecret(plain);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it('returns empty string for invalid ciphertext', () => {
    expect(decryptSecret('not-valid')).toBe('');
    expect(decryptSecret('')).toBe('');
  });

  it('masks secrets correctly', () => {
    expect(maskSecret('sk_live_abcdefghijklmnop')).toMatch(/•+mnop$/);
    expect(maskSecret('short')).toBe('••••');
    expect(maskSecret('')).toBe('');
  });
});
