import * as bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'crypto';

const LEGACY_PASSWORD_SALT = 'smart_pme_salt_2026';
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ valid: boolean; upgradedHash?: string }> {
  if (/^\$2[aby]\$/.test(storedHash)) {
    return { valid: await bcrypt.compare(password, storedHash) };
  }

  const legacyHash = createHash('sha256')
    .update(password + LEGACY_PASSWORD_SALT)
    .digest();
  const storedDigest = Buffer.from(storedHash, 'hex');
  if (storedDigest.length !== legacyHash.length) {
    return { valid: false };
  }

  const valid = timingSafeEqual(legacyHash, storedDigest);
  return valid ? { valid, upgradedHash: await hashPassword(password) } : { valid };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
