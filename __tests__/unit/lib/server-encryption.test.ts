/**
 * Server-side Encryption Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptServerSide,
  decryptServerSide,
  isEncrypted,
  generateEncryptionKey,
  hashPassword,
  verifyPassword,
} from '@/lib/crypto/server-encryption';

describe('Server-side Encryption', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encryptServerSide', () => {
    it('should encrypt a string', () => {
      const plaintext = 'my-secret-password';
      const encrypted = encryptServerSide(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
    });

    it('should return empty string for empty input', () => {
      expect(encryptServerSide('')).toBe('');
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'same-password';
      const encrypted1 = encryptServerSide(plaintext);
      const encrypted2 = encryptServerSide(plaintext);

      // Different IVs should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle special characters', () => {
      const plaintext = 'p@$$w0rd!#$%^&*()_+-=[]{}|;:\'"<>,.?/~`';
      const encrypted = encryptServerSide(plaintext);
      const decrypted = decryptServerSide(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'пароль 密码 パスワード 🔐';
      const encrypted = encryptServerSide(plaintext);
      const decrypted = decryptServerSide(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encryptServerSide(plaintext);
      const decrypted = decryptServerSide(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decryptServerSide', () => {
    it('should decrypt an encrypted string', () => {
      const plaintext = 'my-secret-password';
      const encrypted = encryptServerSide(plaintext);
      const decrypted = decryptServerSide(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string for empty input', () => {
      expect(decryptServerSide('')).toBe('');
    });

    it('should throw error for invalid ciphertext', () => {
      expect(() => decryptServerSide('invalid-ciphertext')).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encryptServerSide('password');
      const tampered = encrypted.slice(0, -4) + 'XXXX';

      expect(() => decryptServerSide(tampered)).toThrow();
    });

    it('should fail with different encryption key', () => {
      const encrypted = encryptServerSide('password');

      // Change the key
      process.env.ENCRYPTION_KEY = 'different-key';

      expect(() => decryptServerSide(encrypted)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', () => {
      const encrypted = encryptServerSide('password');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for short strings', () => {
      expect(isEncrypted('short')).toBe(false);
    });

    it('should return false for non-base64 strings', () => {
      expect(isEncrypted('not valid base64!!!')).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 32-byte key in base64', () => {
      const key = generateEncryptionKey();

      expect(typeof key).toBe('string');
      expect(key.length).toBe(44); // 32 bytes = 44 base64 chars
    });

    it('should generate unique keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'my-secure-password';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$pbkdf2$')).toBe(true);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'same-password';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Different salts should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    it('should respect salt rounds parameter', async () => {
      const password = 'password';

      const hash4 = await hashPassword(password, 4);
      const hash8 = await hashPassword(password, 8);

      // Both should be valid and verifiable
      expect(await verifyPassword(password, hash4)).toBe(true);
      expect(await verifyPassword(password, hash8)).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correct-password';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correct-password';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verifyPassword('password', '');
      expect(isValid).toBe(false);
    });
  });

  describe('Round-trip encryption', () => {
    it('should encrypt and decrypt various data types', () => {
      const testCases = [
        'simple-password',
        '12345',
        'JSON:{"key":"value"}',
        'smtp://user:pass@host:587',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // JWT-like
      ];

      for (const testCase of testCases) {
        const encrypted = encryptServerSide(testCase);
        const decrypted = decryptServerSide(encrypted);
        expect(decrypted).toBe(testCase);
      }
    });
  });
});
