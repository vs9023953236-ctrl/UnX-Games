import crypto from 'crypto';

/**
 * Modern salted slow KDF PIN hashing (PBKDF2)
 * Format: pbkdf2$<iterations>$<saltHex>$<hashHex>
 */
export function hashSecurityPin(pin: string): string {
  const cleanPin = String(pin).trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 10000;
  const hash = crypto.pbkdf2Sync(cleanPin, salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

/**
 * Timing-safe PIN verification supporting modern PBKDF2 with automatic fallback
 * to legacy SHA-256 for backwards compatibility with existing users.
 */
export function verifySecurityPin(inputPin: string, storedHash: string): boolean {
  if (!inputPin || !storedHash) return false;
  const cleanPin = String(inputPin).trim();
  const stored = String(storedHash).trim();

  // 1. Check if stored in modern PBKDF2 format
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedHash = parts[3];
      const computedHash = crypto.pbkdf2Sync(cleanPin, salt, iterations, 32, 'sha256').toString('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
      } catch {
        return false;
      }
    }
  }

  // 2. Legacy SHA-256 fallback for backwards compatibility
  const legacyHash = crypto.createHash('sha256').update(cleanPin).digest('hex');
  try {
    if (stored.length === 64) {
      return crypto.timingSafeEqual(Buffer.from(legacyHash, 'hex'), Buffer.from(stored, 'hex'));
    }
  } catch {
    return false;
  }
  return cleanPin === stored || legacyHash === stored;
}
