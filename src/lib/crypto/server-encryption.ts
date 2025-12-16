/**
 * Server-side encryption utilities
 * Uses AES-256-GCM for encrypting sensitive data at rest
 */

import crypto from 'crypto';

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // GCM recommended IV length
const AUTH_TAG_LENGTH = 16; // GCM auth tag length
const KEY_LENGTH = 32;      // 256 bits

// Environment variable name for encryption key
const ENCRYPTION_KEY_ENV = 'ENCRYPTION_KEY';

/**
 * Get or derive encryption key from environment variable
 * Uses SHA-256 to ensure consistent 32-byte key length
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env[ENCRYPTION_KEY_ENV];

  if (!envKey) {
    // Generate a warning but don't fail - use a derived key from NODE_ENV
    // This is NOT recommended for production!
    console.warn(
      `[Encryption] ${ENCRYPTION_KEY_ENV} not set. Using derived key. ` +
      'Set ENCRYPTION_KEY environment variable for production security.'
    );
    const fallback = `insecure-fallback-key-${process.env.NODE_ENV || 'development'}`;
    return crypto.createHash('sha256').update(fallback).digest();
  }

  // Hash the provided key to ensure consistent 32-byte length
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encryptServerSide(plaintext: string): string {
  if (!plaintext) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a string encrypted with encryptServerSide
 */
export function decryptServerSide(ciphertext: string): string {
  if (!ciphertext) return '';

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to decrypt data. The encryption key may have changed.');
  }
}

/**
 * Check if a string appears to be encrypted
 * (base64 encoded with appropriate length)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  try {
    const decoded = Buffer.from(value, 'base64');
    // Minimum length: IV (12) + Auth Tag (16) + at least 1 byte ciphertext
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Generate a secure encryption key
 * Use this to generate a value for ENCRYPTION_KEY env var
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Hash a password for storage (one-way)
 * Uses bcrypt-compatible approach with PBKDF2
 */
export async function hashPassword(password: string, saltRounds = 12): Promise<string> {
  const salt = crypto.randomBytes(16);
  const iterations = Math.pow(2, saltRounds);

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else {
        // Format: $pbkdf2$iterations$salt$hash
        const result = `$pbkdf2$${iterations}$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
        resolve(result);
      }
    });
  });
}

/**
 * Verify a password against a hash created by hashPassword
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parts = hash.split('$');
    if (parts.length !== 5 || parts[1] !== 'pbkdf2') {
      return false;
    }

    const iterations = parseInt(parts[2], 10);
    const salt = Buffer.from(parts[3], 'base64');
    const storedKey = Buffer.from(parts[4], 'base64');

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(crypto.timingSafeEqual(derivedKey, storedKey));
      });
    });
  } catch {
    return false;
  }
}
