import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  rateLimitMiddleware,
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  smtpTestRateLimiter,
  emailSendRateLimiter,
} from '@/lib/rate-limit';

describe('Rate Limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit('test-user-1', { limit: 5, windowMs: 60000 });
      expect(result.success).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(4);
    });

    it('should track multiple requests', () => {
      const config = { limit: 3, windowMs: 60000 };
      const id = 'test-user-2';

      const result1 = checkRateLimit(id, config);
      expect(result1.current).toBe(1);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit(id, config);
      expect(result2.current).toBe(2);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit(id, config);
      expect(result3.current).toBe(3);
      expect(result3.remaining).toBe(0);
      expect(result3.success).toBe(true);
    });

    it('should reject requests over limit', () => {
      const config = { limit: 2, windowMs: 60000 };
      const id = 'test-user-3';

      checkRateLimit(id, config);
      checkRateLimit(id, config);
      const result = checkRateLimit(id, config);

      expect(result.success).toBe(false);
      expect(result.current).toBe(3);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const config = { limit: 1, windowMs: 1000 };
      const id = 'test-user-4';

      checkRateLimit(id, config);
      const result1 = checkRateLimit(id, config);
      expect(result1.success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      const result2 = checkRateLimit(id, config);
      expect(result2.success).toBe(true);
      expect(result2.current).toBe(1);
    });

    it('should use default config when none provided', () => {
      const result = checkRateLimit('test-user-5');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9); // Default limit is 10
    });

    it('should track different identifiers separately', () => {
      const config = { limit: 1, windowMs: 60000 };

      const result1 = checkRateLimit('user-a', config);
      const result2 = checkRateLimit('user-b', config);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should return null when under limit', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': 'middleware-test-1' },
      });

      const result = await rateLimitMiddleware(request, { limit: 10, windowMs: 60000 });
      expect(result).toBeNull();
    });

    it('should return 429 response when over limit', async () => {
      const config = { limit: 1, windowMs: 60000 };

      const request1 = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': 'middleware-test-2' },
      });
      await rateLimitMiddleware(request1, config);

      const request2 = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': 'middleware-test-2' },
      });
      const result = await rateLimitMiddleware(request2, config);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);

      const body = await result?.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBeDefined();
    });

    it('should include rate limit headers in 429 response', async () => {
      const config = { limit: 1, windowMs: 60000 };

      const request1 = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': 'middleware-test-3' },
      });
      await rateLimitMiddleware(request1, config);

      const request2 = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': 'middleware-test-3' },
      });
      const result = await rateLimitMiddleware(request2, config);

      expect(result?.headers.get('Retry-After')).toBeDefined();
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('1');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should use anonymous as identifier when no forwarded IP', async () => {
      const request = new Request('http://localhost/api/test');
      const result = await rateLimitMiddleware(request, { limit: 10, windowMs: 60000 });
      expect(result).toBeNull();
    });

    it('should extract first IP from x-forwarded-for header', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      });
      const result = await rateLimitMiddleware(request, { limit: 10, windowMs: 60000 });
      expect(result).toBeNull();
    });
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with custom config', () => {
      const limiter = createRateLimiter({ limit: 5, windowMs: 30000 });

      expect(limiter.check).toBeDefined();
      expect(limiter.middleware).toBeDefined();
    });

    it('should use configured limits', () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 60000 });

      const result1 = limiter.check('custom-limiter-1');
      expect(result1.remaining).toBe(1);

      const result2 = limiter.check('custom-limiter-1');
      expect(result2.remaining).toBe(0);

      const result3 = limiter.check('custom-limiter-1');
      expect(result3.success).toBe(false);
    });

    it('should provide middleware function', async () => {
      const limiter = createRateLimiter({ limit: 1, windowMs: 60000 });

      const request1 = new Request('http://localhost/api', {
        headers: { 'x-forwarded-for': 'custom-middleware-1' },
      });
      const result1 = await limiter.middleware(request1);
      expect(result1).toBeNull();

      const request2 = new Request('http://localhost/api', {
        headers: { 'x-forwarded-for': 'custom-middleware-1' },
      });
      const result2 = await limiter.middleware(request2);
      expect(result2?.status).toBe(429);
    });
  });

  describe('Pre-configured Rate Limiters', () => {
    it('apiRateLimiter should have 100 req/min limit', () => {
      const result = apiRateLimiter.check('api-test');
      expect(result.remaining).toBe(99);
    });

    it('authRateLimiter should have 5 req/min limit', () => {
      const result = authRateLimiter.check('auth-test');
      expect(result.remaining).toBe(4);
    });

    it('smtpTestRateLimiter should have 5 req/5min limit', () => {
      const result = smtpTestRateLimiter.check('smtp-test');
      expect(result.remaining).toBe(4);
    });

    it('emailSendRateLimiter should have 10 req/min limit', () => {
      const result = emailSendRateLimiter.check('email-test');
      expect(result.remaining).toBe(9);
    });
  });
});
