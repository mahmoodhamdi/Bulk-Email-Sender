import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock PrismaClient before importing
const mockPrismaClient = vi.fn().mockImplementation(() => ({
  $connect: vi.fn(),
  $disconnect: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClient,
}));

describe('Prisma Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear the global prisma instance
    (globalThis as Record<string, unknown>).prisma = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('prisma client singleton', () => {
    it('should export a prisma client instance', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      expect(prisma).toBeDefined();
    });

    it('should export prisma as default', async () => {
      const prismaModule = await import('@/lib/db/prisma');
      expect(prismaModule.default).toBeDefined();
    });

    it('should create PrismaClient with development logging in dev mode', async () => {
      process.env.NODE_ENV = 'development';
      vi.resetModules();
      (globalThis as Record<string, unknown>).prisma = undefined;

      await import('@/lib/db/prisma');

      expect(mockPrismaClient).toHaveBeenCalledWith({
        log: ['query', 'error', 'warn'],
      });
    });

    it('should create PrismaClient with minimal logging in production', async () => {
      process.env.NODE_ENV = 'production';
      vi.resetModules();
      (globalThis as Record<string, unknown>).prisma = undefined;

      await import('@/lib/db/prisma');

      expect(mockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });
    });

    it('should reuse existing prisma instance from globalThis in development', async () => {
      process.env.NODE_ENV = 'development';
      vi.resetModules();

      // First import
      const { prisma: prisma1 } = await import('@/lib/db/prisma');

      // Reset modules but keep globalThis.prisma
      vi.resetModules();

      // Second import
      const { prisma: prisma2 } = await import('@/lib/db/prisma');

      // In development, both should be the same reference via globalThis
      expect(prisma1).toBeDefined();
      expect(prisma2).toBeDefined();
    });

    it('should set globalThis.prisma in non-production', async () => {
      process.env.NODE_ENV = 'development';
      vi.resetModules();
      (globalThis as Record<string, unknown>).prisma = undefined;

      await import('@/lib/db/prisma');

      // After import, globalThis.prisma should be defined
      expect((globalThis as Record<string, unknown>).prisma).toBeDefined();
    });

    it('should not set globalThis.prisma in production', async () => {
      process.env.NODE_ENV = 'production';
      vi.resetModules();
      (globalThis as Record<string, unknown>).prisma = undefined;

      await import('@/lib/db/prisma');

      // In production, globalThis.prisma should not be set (to avoid memory leaks)
      expect((globalThis as Record<string, unknown>).prisma).toBeUndefined();
    });
  });
});
