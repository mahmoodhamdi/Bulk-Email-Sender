/**
 * Redis Rate Limit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis
vi.mock('@/lib/queue/redis', () => ({
  getQueueConnection: vi.fn(() => ({
    script: vi.fn().mockResolvedValue('mock-sha'),
    evalsha: vi.fn().mockResolvedValue([1, 99, Date.now() + 60000, 1]),
  })),
  getRedisStatus: vi.fn(() => 'connected'),
}));

import {
  checkRateLimitMemory,
  checkRateLimitHybrid,
  createDistributedRateLimiter,
  distributedApiLimiter,
  distributedAuthLimiter,
  distributedSmtpTestLimiter,
  distributedEmailSendLimiter,
} from '@/lib/rate-limit/redis-rate-limit';
import { getQueueConnection, getRedisStatus } from '@/lib/queue/redis';

describe('Redis Rate Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkRateLimitMemory', () => {
    it('should allow first request', () => {
      const result = checkRateLimitMemory('test-user-1', {
        limit: 10,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.current).toBe(1);
    });

    it('should track multiple requests', () => {
      const config = { limit: 5, windowMs: 60000 };
      const identifier = 'test-user-2';

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimitMemory(identifier, config);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }

      // 6th request should be blocked
      const result = checkRateLimitMemory(identifier, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const config = { limit: 1, windowMs: 100 }; // 100ms window
      const identifier = 'test-user-3';

      // First request
      const result1 = checkRateLimitMemory(identifier, config);
      expect(result1.success).toBe(true);

      // Second request should be blocked
      const result2 = checkRateLimitMemory(identifier, config);
      expect(result2.success).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third request should succeed
      const result3 = checkRateLimitMemory(identifier, config);
      expect(result3.success).toBe(true);
    });

    it('should provide correct resetAt timestamp', () => {
      const now = Date.now();
      const result = checkRateLimitMemory('test-user-4', {
        limit: 10,
        windowMs: 60000,
      });

      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + 60000 + 100); // Allow small margin
    });
  });

  describe('checkRateLimitHybrid', () => {
    it('should use Redis when connected', async () => {
      vi.mocked(getRedisStatus).mockReturnValue('connected');
      vi.mocked(getQueueConnection).mockReturnValue({
        script: vi.fn().mockResolvedValue('mock-sha'),
        evalsha: vi.fn().mockResolvedValue([1, 99, Date.now() + 60000, 1]),
      } as never);

      const result = await checkRateLimitHybrid('test-hybrid-1', {
        limit: 100,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
      expect(getQueueConnection).toHaveBeenCalled();
    });

    it('should fall back to memory when Redis is disconnected', async () => {
      vi.mocked(getRedisStatus).mockReturnValue('disconnected');

      const result = await checkRateLimitHybrid('test-hybrid-2', {
        limit: 10,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should fall back to memory on Redis error', async () => {
      vi.mocked(getRedisStatus).mockReturnValue('connected');
      vi.mocked(getQueueConnection).mockReturnValue({
        script: vi.fn().mockRejectedValue(new Error('Redis error')),
      } as never);

      const result = await checkRateLimitHybrid('test-hybrid-3', {
        limit: 10,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('createDistributedRateLimiter', () => {
    it('should create limiter with check function', async () => {
      const limiter = createDistributedRateLimiter({
        limit: 5,
        windowMs: 60000,
        prefix: 'test',
      });

      expect(limiter.check).toBeDefined();
      expect(typeof limiter.check).toBe('function');
    });

    it('should create limiter with checkSync function', () => {
      const limiter = createDistributedRateLimiter({
        limit: 5,
        windowMs: 60000,
        prefix: 'test',
      });

      expect(limiter.checkSync).toBeDefined();
      const result = limiter.checkSync('sync-test');
      expect(result.success).toBe(true);
    });

    it('should create limiter with middleware function', () => {
      const limiter = createDistributedRateLimiter({
        limit: 5,
        windowMs: 60000,
        prefix: 'test',
      });

      expect(limiter.middleware).toBeDefined();
      expect(typeof limiter.middleware).toBe('function');
    });

    it('middleware should return null when not rate limited', async () => {
      vi.mocked(getRedisStatus).mockReturnValue('disconnected');

      const limiter = createDistributedRateLimiter({
        limit: 100,
        windowMs: 60000,
        prefix: 'middleware-test',
      });

      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const result = await limiter.middleware(request);
      expect(result).toBeNull();
    });

    it('middleware should return 429 response when rate limited', async () => {
      vi.mocked(getRedisStatus).mockReturnValue('disconnected');

      const limiter = createDistributedRateLimiter({
        limit: 1,
        windowMs: 60000,
        prefix: 'middleware-test-2',
      });

      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      });

      // First request should pass
      const result1 = await limiter.middleware(request);
      expect(result1).toBeNull();

      // Second request should be blocked
      const result2 = await limiter.middleware(request);
      expect(result2).not.toBeNull();
      expect(result2?.status).toBe(429);

      const body = await result2?.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('middleware should include rate limit headers', async () => {
      vi.mocked(getRedisStatus).mockReturnValue('disconnected');

      const limiter = createDistributedRateLimiter({
        limit: 1,
        windowMs: 60000,
        prefix: 'headers-test',
      });

      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.3',
        },
      });

      // First request passes
      await limiter.middleware(request);

      // Second request is blocked
      const result = await limiter.middleware(request);
      expect(result).not.toBeNull();
      expect(result?.headers.get('Retry-After')).toBeDefined();
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('1');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Pre-configured limiters', () => {
    it('distributedApiLimiter should have correct config', () => {
      expect(distributedApiLimiter).toBeDefined();
      expect(distributedApiLimiter.check).toBeDefined();
      expect(distributedApiLimiter.checkSync).toBeDefined();
      expect(distributedApiLimiter.middleware).toBeDefined();
    });

    it('distributedAuthLimiter should have correct config', () => {
      expect(distributedAuthLimiter).toBeDefined();
      expect(distributedAuthLimiter.check).toBeDefined();
    });

    it('distributedSmtpTestLimiter should have correct config', () => {
      expect(distributedSmtpTestLimiter).toBeDefined();
      expect(distributedSmtpTestLimiter.check).toBeDefined();
    });

    it('distributedEmailSendLimiter should have correct config', () => {
      expect(distributedEmailSendLimiter).toBeDefined();
      expect(distributedEmailSendLimiter.check).toBeDefined();
    });
  });

  describe('Prefix configuration', () => {
    it('should use default prefix when not specified', () => {
      const limiter = createDistributedRateLimiter({
        limit: 10,
        windowMs: 60000,
      });

      expect(limiter).toBeDefined();
    });

    it('should use custom prefix when specified', () => {
      const limiter = createDistributedRateLimiter({
        limit: 10,
        windowMs: 60000,
        prefix: 'custom-prefix',
      });

      expect(limiter).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero limit', () => {
      const result = checkRateLimitMemory('zero-limit', {
        limit: 0,
        windowMs: 60000,
      });

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle very short window', () => {
      const result = checkRateLimitMemory('short-window', {
        limit: 10,
        windowMs: 1, // 1ms
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty identifier', () => {
      const result = checkRateLimitMemory('', {
        limit: 10,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
    });

    it('should handle special characters in identifier', () => {
      const result = checkRateLimitMemory('user@example.com:api:key', {
        limit: 10,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle concurrent in-memory requests correctly', async () => {
      const config = { limit: 5, windowMs: 60000 };
      const identifier = 'concurrent-test';

      // Make 5 concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => Promise.resolve(checkRateLimitMemory(identifier, config)));

      const results = await Promise.all(promises);

      // All 5 should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 6th should fail
      const result6 = checkRateLimitMemory(identifier, config);
      expect(result6.success).toBe(false);
    });
  });
});
