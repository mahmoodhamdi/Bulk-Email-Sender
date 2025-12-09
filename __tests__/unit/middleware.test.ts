import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-intl/middleware before importing the middleware
vi.mock('next-intl/middleware', () => ({
  default: vi.fn((config) => {
    // Return a mock middleware function that stores config for testing
    const mockMiddleware = vi.fn(() => new Response());
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

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should have matcher for non-special paths', async () => {
      const { config } = await import('@/middleware');
      // Check for the pattern that excludes api, _next, _vercel, and files with extensions
      const hasNonSpecialMatcher = config.matcher.some((m: string) =>
        m.includes('(?!api|_next|_vercel|.*\\..*)')
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
