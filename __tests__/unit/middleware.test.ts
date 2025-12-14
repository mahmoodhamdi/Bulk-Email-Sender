import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

// Mock next-intl/middleware before importing the middleware
vi.mock('next-intl/middleware', () => ({
  default: vi.fn((config) => {
    // Return a mock middleware function that stores config for testing
    const mockMiddleware = vi.fn(() => {
      const response = new Response();
      response.headers.set('x-middleware-rewrite', 'true');
      return response;
    });
    (mockMiddleware as Record<string, unknown>).__config = config;
    return mockMiddleware;
  }),
}));

// Mock the routing import
vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
  },
}));

// Helper to create NextRequest-like objects
function createMockRequest(url: string, options: { method?: string; headers?: Record<string, string> } = {}) {
  const request = new Request(url, {
    method: options.method || 'GET',
    headers: options.headers,
  });
  // Add nextUrl property that NextRequest has
  const nextUrl = new URL(url);
  (request as unknown as NextRequest).nextUrl = nextUrl;
  return request as unknown as NextRequest;
}

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('middleware configuration', () => {
    it('should export default middleware function', async () => {
      const middleware = await import('@/middleware');
      expect(middleware.default).toBeDefined();
    });

    it('should export config with correct matcher', async () => {
      const { config } = await import('@/middleware');
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
    });

    it('should have matcher for root path', async () => {
      const { config } = await import('@/middleware');
      expect(config.matcher).toContain('/');
    });

    it('should have matcher for locale paths', async () => {
      const { config } = await import('@/middleware');
      expect(config.matcher).toContain('/(ar|en)/:path*');
    });

    it('should have matcher for non-special paths excluding _next and _vercel', async () => {
      const { config } = await import('@/middleware');
      // Check for the pattern that excludes _next, _vercel, and files with extensions
      const hasNonSpecialMatcher = config.matcher.some((m: string) =>
        m.includes('(?!_next|_vercel|.*\\..*)')
      );
      expect(hasNonSpecialMatcher).toBe(true);
    });
  });

  describe('createMiddleware', () => {
    it('should create middleware using next-intl', async () => {
      const middleware = await import('@/middleware');
      // The middleware should be a function (the result of createMiddleware)
      expect(typeof middleware.default).toBe('function');
    });
  });
});
