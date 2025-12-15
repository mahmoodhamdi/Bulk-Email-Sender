import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  extractApiKey,
  hasPermission,
  checkApiKeyRateLimit,
  cleanupRateLimitEntries,
} from '@/lib/auth/api-key';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('API Key Utilities', () => {
  describe('API_KEY_PREFIX', () => {
    it('should be bes_', () => {
      expect(API_KEY_PREFIX).toBe('bes_');
    });
  });

  describe('generateApiKey', () => {
    it('should generate a key with correct prefix', () => {
      const { key } = generateApiKey();
      expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    });

    it('should generate unique keys', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        const { key } = generateApiKey();
        keys.add(key);
      }
      expect(keys.size).toBe(100);
    });

    it('should return key, hash, and prefix', () => {
      const result = generateApiKey();
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('prefix');
    });

    it('should return prefix of 12 characters', () => {
      const { prefix } = generateApiKey();
      expect(prefix.length).toBe(12);
    });

    it('should return hash that is different from key', () => {
      const { key, hash } = generateApiKey();
      expect(hash).not.toBe(key);
    });

    it('should generate consistent hashes for same key', () => {
      const { key, hash } = generateApiKey();
      const rehash = hashApiKey(key);
      expect(hash).toBe(rehash);
    });
  });

  describe('hashApiKey', () => {
    it('should return a SHA256 hex string', () => {
      const hash = hashApiKey('test_key');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce same hash for same input', () => {
      const hash1 = hashApiKey('same_key');
      const hash2 = hashApiKey('same_key');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashApiKey('key1');
      const hash2 = hashApiKey('key2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('extractApiKey', () => {
    it('should extract API key from Bearer token', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: `Bearer ${API_KEY_PREFIX}abc123`,
        },
      });

      const key = extractApiKey(request);
      expect(key).toBe(`${API_KEY_PREFIX}abc123`);
    });

    it('should extract API key from X-API-Key header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'X-API-Key': `${API_KEY_PREFIX}xyz789`,
        },
      });

      const key = extractApiKey(request);
      expect(key).toBe(`${API_KEY_PREFIX}xyz789`);
    });

    it('should return null for non-API key Bearer token', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer jwt_token_here',
        },
      });

      const key = extractApiKey(request);
      expect(key).toBeNull();
    });

    it('should return null for non-API key X-API-Key header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'X-API-Key': 'invalid_key',
        },
      });

      const key = extractApiKey(request);
      expect(key).toBeNull();
    });

    it('should return null when no auth headers present', () => {
      const request = new NextRequest('http://localhost/api/test');
      const key = extractApiKey(request);
      expect(key).toBeNull();
    });

    it('should prefer Authorization header over X-API-Key', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: `Bearer ${API_KEY_PREFIX}from_bearer`,
          'X-API-Key': `${API_KEY_PREFIX}from_header`,
        },
      });

      const key = extractApiKey(request);
      expect(key).toBe(`${API_KEY_PREFIX}from_bearer`);
    });
  });

  describe('hasPermission', () => {
    it('should return true for wildcard permission', () => {
      expect(hasPermission(['*'], 'campaigns:read')).toBe(true);
    });

    it('should return true for category wildcard', () => {
      expect(hasPermission(['campaigns:*'], 'campaigns:read')).toBe(true);
      expect(hasPermission(['campaigns:*'], 'campaigns:write')).toBe(true);
      expect(hasPermission(['campaigns:*'], 'campaigns:delete')).toBe(true);
    });

    it('should return true for exact match', () => {
      expect(hasPermission(['campaigns:read'], 'campaigns:read')).toBe(true);
    });

    it('should return false for missing permission', () => {
      expect(hasPermission(['campaigns:read'], 'campaigns:write')).toBe(false);
    });

    it('should handle array of required permissions', () => {
      expect(
        hasPermission(['campaigns:read', 'contacts:read'], ['campaigns:read', 'contacts:read'])
      ).toBe(true);
    });

    it('should return true if any required permission matches', () => {
      expect(
        hasPermission(['campaigns:read'], ['campaigns:read', 'contacts:read'])
      ).toBe(true);
    });

    it('should return false for empty permissions array', () => {
      expect(hasPermission([], 'campaigns:read')).toBe(false);
    });

    it('should handle different categories correctly', () => {
      expect(hasPermission(['campaigns:*'], 'contacts:read')).toBe(false);
    });
  });

  describe('checkApiKeyRateLimit', () => {
    beforeEach(() => {
      // Clean up rate limit entries before each test
      cleanupRateLimitEntries();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should allow first request', async () => {
      const result = await checkApiKeyRateLimit('test-key-1', 100);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should decrement remaining count', async () => {
      const result1 = await checkApiKeyRateLimit('test-key-2', 100);
      expect(result1.remaining).toBe(99);

      const result2 = await checkApiKeyRateLimit('test-key-2', 100);
      expect(result2.remaining).toBe(98);
    });

    it('should block when limit is reached', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await checkApiKeyRateLimit('test-key-3', 5);
      }

      // Next request should be blocked
      const result = await checkApiKeyRateLimit('test-key-3', 5);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return resetAt time', async () => {
      const result = await checkApiKeyRateLimit('test-key-4', 100);
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset after window expires', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await checkApiKeyRateLimit('test-key-5', 5);
      }

      // Verify blocked
      let result = await checkApiKeyRateLimit('test-key-5', 5);
      expect(result.allowed).toBe(false);

      // Advance time past the window (1 hour + 1 second)
      vi.setSystemTime(now + 60 * 60 * 1000 + 1000);

      // Should be allowed again
      result = await checkApiKeyRateLimit('test-key-5', 5);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track different API keys separately', async () => {
      // Use up limit for key A
      for (let i = 0; i < 5; i++) {
        await checkApiKeyRateLimit('key-a', 5);
      }

      // Key A should be blocked
      const resultA = await checkApiKeyRateLimit('key-a', 5);
      expect(resultA.allowed).toBe(false);

      // Key B should still be allowed
      const resultB = await checkApiKeyRateLimit('key-b', 5);
      expect(resultB.allowed).toBe(true);
    });
  });

  describe('cleanupRateLimitEntries', () => {
    beforeEach(() => {
      cleanupRateLimitEntries();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should remove expired entries', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Create an entry
      await checkApiKeyRateLimit('cleanup-test', 100);

      // Advance time past window
      vi.setSystemTime(now + 60 * 60 * 1000 + 1000);

      // Cleanup
      cleanupRateLimitEntries();

      // New request should start fresh
      const result = await checkApiKeyRateLimit('cleanup-test', 100);
      expect(result.remaining).toBe(99);
    });
  });
});
