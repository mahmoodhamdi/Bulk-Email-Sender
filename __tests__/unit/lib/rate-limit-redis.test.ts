import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Redis connection module before importing rate limiter
vi.mock('@/lib/queue/redis', () => ({
  getQueueConnection: vi.fn(),
  getRedisStatus: vi.fn(),
}));

import { getQueueConnection, getRedisStatus } from '@/lib/queue/redis';
import {
  checkRateLimitRedis,
  createRedisRateLimiter,
  rateLimitMiddlewareRedis,
  resetRateLimit,
  getRateLimitStatus,
} from '@/lib/rate-limit-redis';

const mockGetRedisStatus = vi.mocked(getRedisStatus);
const mockGetQueueConnection = vi.mocked(getQueueConnection);

describe('Redis Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to disconnected to test fallback behavior
    mockGetRedisStatus.mockReturnValue('disconnected');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fallback behavior (when Redis is unavailable)', () => {
    it('should allow first request', async () => {
      const result = await checkRateLimitRedis('test-user-1', {
        limit: 5,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(4);
    });

    it('should track multiple requests', async () => {
      const config = { limit: 5, windowMs: 60000, prefix: 'test2' };

      // Make 3 requests
      await checkRateLimitRedis('test-user-2', config);
      await checkRateLimitRedis('test-user-2', config);
      const result = await checkRateLimitRedis('test-user-2', config);

      expect(result.success).toBe(true);
      expect(result.current).toBe(3);
      expect(result.remaining).toBe(2);
    });

    it('should block requests over limit', async () => {
      const config = { limit: 3, windowMs: 60000, prefix: 'test3' };

      // Make 4 requests (limit is 3)
      await checkRateLimitRedis('test-user-3', config);
      await checkRateLimitRedis('test-user-3', config);
      await checkRateLimitRedis('test-user-3', config);
      const result = await checkRateLimitRedis('test-user-3', config);

      expect(result.success).toBe(false);
      expect(result.current).toBe(4);
      expect(result.remaining).toBe(0);
    });

    it('should track different identifiers separately', async () => {
      const config = { limit: 2, windowMs: 60000, prefix: 'test4' };

      await checkRateLimitRedis('user-a', config);
      await checkRateLimitRedis('user-a', config);
      const resultA = await checkRateLimitRedis('user-a', config);

      const resultB = await checkRateLimitRedis('user-b', config);

      expect(resultA.success).toBe(false);
      expect(resultA.current).toBe(3);

      expect(resultB.success).toBe(true);
      expect(resultB.current).toBe(1);
    });

    it('should include resetAt timestamp', async () => {
      const now = Date.now();
      const windowMs = 60000;
      const result = await checkRateLimitRedis('test-user-time', {
        limit: 5,
        windowMs,
        prefix: 'test-time',
      });

      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + windowMs + 100);
    });
  });

  describe('createRedisRateLimiter', () => {
    it('should create a rate limiter with check method', async () => {
      const limiter = createRedisRateLimiter({
        limit: 10,
        windowMs: 60000,
        prefix: 'custom',
      });

      const result = await limiter.check('test-identifier');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetAt');
      expect(result).toHaveProperty('current');
    });

    it('should create a rate limiter with middleware method', async () => {
      const limiter = createRedisRateLimiter({
        limit: 10,
        windowMs: 60000,
        prefix: 'middleware',
      });

      expect(limiter.middleware).toBeDefined();
      expect(typeof limiter.middleware).toBe('function');
    });
  });

  describe('rateLimitMiddlewareRedis', () => {
    it('should return null when request is allowed', async () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'x-forwarded-for': 'unique-ip-1' },
      });

      const result = await rateLimitMiddlewareRedis(request, {
        limit: 10,
        windowMs: 60000,
        prefix: 'mw-test',
      });

      expect(result).toBeNull();
    });

    it('should return 429 response when rate limited', async () => {
      const config = { limit: 1, windowMs: 60000, prefix: 'mw-blocked' };

      // Use up the limit
      const request1 = new Request('https://example.com/api/test', {
        headers: { 'x-forwarded-for': 'blocked-ip' },
      });
      await rateLimitMiddlewareRedis(request1, config);

      // Second request should be blocked
      const request2 = new Request('https://example.com/api/test', {
        headers: { 'x-forwarded-for': 'blocked-ip' },
      });
      const result = await rateLimitMiddlewareRedis(request2, config);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);

      const body = await result?.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('should include rate limit headers in 429 response', async () => {
      const config = { limit: 1, windowMs: 60000, prefix: 'mw-headers' };

      const request1 = new Request('https://example.com/api/test', {
        headers: { 'x-forwarded-for': 'header-test-ip' },
      });
      await rateLimitMiddlewareRedis(request1, config);

      const request2 = new Request('https://example.com/api/test', {
        headers: { 'x-forwarded-for': 'header-test-ip' },
      });
      const result = await rateLimitMiddlewareRedis(request2, config);

      expect(result?.headers.get('Retry-After')).toBeDefined();
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('1');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should use anonymous for requests without forwarded IP', async () => {
      const request = new Request('https://example.com/api/test');

      const result = await rateLimitMiddlewareRedis(request, {
        limit: 10,
        windowMs: 60000,
        prefix: 'mw-anon',
      });

      expect(result).toBeNull();
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for fallback store', async () => {
      const config = { limit: 1, windowMs: 60000, prefix: 'reset-test' };

      // Use up the limit
      await checkRateLimitRedis('reset-user', config);
      const blocked = await checkRateLimitRedis('reset-user', config);
      expect(blocked.success).toBe(false);

      // Reset
      const resetResult = await resetRateLimit('reset-user', 'reset-test');
      expect(resetResult).toBe(true);

      // Should be allowed again
      const afterReset = await checkRateLimitRedis('reset-user', config);
      expect(afterReset.success).toBe(true);
      expect(afterReset.current).toBe(1);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current status without incrementing', async () => {
      const config = { limit: 5, windowMs: 60000, prefix: 'status-test' };

      // Make some requests
      await checkRateLimitRedis('status-user', config);
      await checkRateLimitRedis('status-user', config);

      // Get status
      const status = await getRateLimitStatus('status-user', config);

      // Check status reflects current state
      expect(status.current).toBe(2);
      expect(status.remaining).toBe(3);
      expect(status.success).toBe(true);

      // Make sure status didn't increment
      const statusAgain = await getRateLimitStatus('status-user', config);
      expect(statusAgain.current).toBe(2);
    });

    it('should return full limit for unknown identifier', async () => {
      const config = { limit: 10, windowMs: 60000, prefix: 'unknown-test' };

      const status = await getRateLimitStatus('unknown-user', config);

      expect(status.current).toBe(0);
      expect(status.remaining).toBe(10);
      expect(status.success).toBe(true);
    });
  });

  describe('with Redis connected', () => {
    let mockRedis: {
      eval: ReturnType<typeof vi.fn>;
      del: ReturnType<typeof vi.fn>;
      zremrangebyscore: ReturnType<typeof vi.fn>;
      zcard: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockRedis = {
        eval: vi.fn(),
        del: vi.fn(),
        zremrangebyscore: vi.fn(),
        zcard: vi.fn(),
      };
      mockGetRedisStatus.mockReturnValue('connected');
      mockGetQueueConnection.mockReturnValue(mockRedis as never);
    });

    it('should use Redis when connected', async () => {
      mockRedis.eval.mockResolvedValue([1, 1, 9]);

      const result = await checkRateLimitRedis('redis-user', {
        limit: 10,
        windowMs: 60000,
        prefix: 'redis-test',
      });

      expect(mockRedis.eval).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(9);
    });

    it('should fallback on Redis error', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Redis error'));

      const result = await checkRateLimitRedis('fallback-user', {
        limit: 10,
        windowMs: 60000,
        prefix: 'fallback-error',
      });

      // Should still work via fallback
      expect(result.success).toBe(true);
    });

    it('should reset rate limit in Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await resetRateLimit('redis-reset-user', 'test-prefix');

      expect(mockRedis.del).toHaveBeenCalledWith('test-prefix:redis-reset-user');
      expect(result).toBe(true);
    });

    it('should get rate limit status from Redis', async () => {
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcard.mockResolvedValue(5);

      const status = await getRateLimitStatus('redis-status-user', {
        limit: 10,
        windowMs: 60000,
        prefix: 'status-redis',
      });

      expect(mockRedis.zcard).toHaveBeenCalled();
      expect(status.current).toBe(5);
      expect(status.remaining).toBe(5);
    });
  });
});
