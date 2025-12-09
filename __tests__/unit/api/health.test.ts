import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

    it('should include version from package or default', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
      expect(typeof data.version).toBe('string');
    });

    it('should return default version when not set', async () => {
      delete process.env.npm_package_version;
      const response = await GET();
      const data = await response.json();

      expect(data.version).toBe('1.0.0');
    });

    it('should use npm_package_version when set', async () => {
      process.env.npm_package_version = '2.0.0';
      const response = await GET();
      const data = await response.json();

      expect(data.version).toBe('2.0.0');
    });

    it('should include environment', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeDefined();
      expect(typeof data.environment).toBe('string');
    });

    it('should return development environment by default in tests', async () => {
      delete process.env.NODE_ENV;
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBe('development');
    });

    it('should return correct environment when set', async () => {
      process.env.NODE_ENV = 'production';
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBe('production');
    });

    it('should return JSON content type', async () => {
      const response = await GET();
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
