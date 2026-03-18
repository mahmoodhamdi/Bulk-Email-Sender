import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

// Mock queue redis health check
vi.mock('@/lib/queue', () => ({
  checkRedisHealth: vi.fn().mockResolvedValue({ connected: true, latency: 1 }),
}));

import { GET } from '@/app/api/health/route';

describe('Health API Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should include timestamp in ISO format', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('should not expose version, environment, or uptime', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeUndefined();
      expect(data.environment).toBeUndefined();
      expect(data.uptime).toBeUndefined();
    });

    it('should include checks with name and status only', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.checks).toBeDefined();
      expect(Array.isArray(data.checks)).toBe(true);
      for (const check of data.checks) {
        expect(check.name).toBeDefined();
        expect(check.status).toBeDefined();
        // Should not expose latency or error messages publicly
        expect(check.latency).toBeUndefined();
        expect(check.message).toBeUndefined();
      }
    });

    it('should return JSON content type', async () => {
      const response = await GET();
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
