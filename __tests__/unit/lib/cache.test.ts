/**
 * Redis Cache Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ioredis before importing cache module
vi.mock('ioredis', () => {
  const mockRedis = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    info: vi.fn(),
    quit: vi.fn(),
    status: 'ready',
    on: vi.fn(),
  };

  return {
    default: vi.fn(() => mockRedis),
  };
});

// Set REDIS_URL for tests
process.env.REDIS_URL = 'redis://localhost:6379/0';

import {
  CACHE_PREFIXES,
  CACHE_TTL,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetOrSet,
  cacheTemplate,
  getCachedTemplate,
  invalidateTemplateCache,
  cacheTemplatesList,
  getCachedTemplatesList,
  cacheCampaign,
  getCachedCampaign,
  invalidateCampaignCache,
  cacheCampaignStats,
  getCachedCampaignStats,
  cacheUser,
  getCachedUser,
  invalidateUserCache,
  cacheSession,
  getCachedSession,
  invalidateSessionCache,
  getCacheStats,
} from '@/lib/cache';
import Redis from 'ioredis';

describe('Cache Module', () => {
  let mockRedis: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = vi.mocked(Redis).mock.results[0]?.value || vi.mocked(Redis)();
  });

  describe('Constants', () => {
    it('should have correct cache prefixes', () => {
      expect(CACHE_PREFIXES.TEMPLATE).toBe('cache:template:');
      expect(CACHE_PREFIXES.TEMPLATES_LIST).toBe('cache:templates:list:');
      expect(CACHE_PREFIXES.CAMPAIGN).toBe('cache:campaign:');
      expect(CACHE_PREFIXES.CAMPAIGN_STATS).toBe('cache:campaign:stats:');
      expect(CACHE_PREFIXES.CONTACT).toBe('cache:contact:');
      expect(CACHE_PREFIXES.USER).toBe('cache:user:');
      expect(CACHE_PREFIXES.SESSION).toBe('cache:session:');
    });

    it('should have correct TTL values', () => {
      expect(CACHE_TTL.SHORT).toBe(60);
      expect(CACHE_TTL.MEDIUM).toBe(300);
      expect(CACHE_TTL.LONG).toBe(900);
      expect(CACHE_TTL.EXTENDED).toBe(3600);
      expect(CACHE_TTL.DAY).toBe(86400);
    });
  });

  describe('Core Functions', () => {
    describe('cacheGet', () => {
      it('should return parsed JSON value when key exists', async () => {
        const testData = { id: '123', name: 'Test' };
        mockRedis.get.mockResolvedValue(JSON.stringify(testData));

        const result = await cacheGet('test-key');
        expect(result).toEqual(testData);
      });

      it('should return null when key does not exist', async () => {
        mockRedis.get.mockResolvedValue(null);

        const result = await cacheGet('missing-key');
        expect(result).toBeNull();
      });

      it('should return null on error', async () => {
        mockRedis.get.mockRejectedValue(new Error('Connection failed'));

        const result = await cacheGet('error-key');
        expect(result).toBeNull();
      });
    });

    describe('cacheSet', () => {
      it('should set value with default TTL', async () => {
        mockRedis.setex.mockResolvedValue('OK');

        const result = await cacheSet('test-key', { data: 'value' });
        expect(result).toBe(true);
        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test-key',
          CACHE_TTL.MEDIUM,
          JSON.stringify({ data: 'value' })
        );
      });

      it('should set value with custom TTL', async () => {
        mockRedis.setex.mockResolvedValue('OK');

        const result = await cacheSet('test-key', { data: 'value' }, 600);
        expect(result).toBe(true);
        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test-key',
          600,
          JSON.stringify({ data: 'value' })
        );
      });

      it('should return false on error', async () => {
        mockRedis.setex.mockRejectedValue(new Error('Write failed'));

        const result = await cacheSet('test-key', { data: 'value' });
        expect(result).toBe(false);
      });
    });

    describe('cacheDelete', () => {
      it('should delete key successfully', async () => {
        mockRedis.del.mockResolvedValue(1);

        const result = await cacheDelete('test-key');
        expect(result).toBe(true);
      });

      it('should return false on error', async () => {
        mockRedis.del.mockRejectedValue(new Error('Delete failed'));

        const result = await cacheDelete('test-key');
        expect(result).toBe(false);
      });
    });

    describe('cacheDeletePattern', () => {
      it('should delete keys matching pattern', async () => {
        mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
        mockRedis.del.mockResolvedValue(3);

        const result = await cacheDeletePattern('cache:test:*');
        expect(result).toBe(3);
      });

      it('should return 0 when no keys match', async () => {
        mockRedis.keys.mockResolvedValue([]);

        const result = await cacheDeletePattern('cache:nomatch:*');
        expect(result).toBe(0);
      });
    });

    describe('cacheGetOrSet', () => {
      it('should return cached value if exists', async () => {
        const cachedData = { id: '123', cached: true };
        mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

        const factory = vi.fn().mockResolvedValue({ id: '123', cached: false });
        const result = await cacheGetOrSet('test-key', factory);

        expect(result).toEqual(cachedData);
        expect(factory).not.toHaveBeenCalled();
      });

      it('should call factory and cache result when not cached', async () => {
        const freshData = { id: '123', fresh: true };
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const factory = vi.fn().mockResolvedValue(freshData);
        const result = await cacheGetOrSet('test-key', factory);

        expect(result).toEqual(freshData);
        expect(factory).toHaveBeenCalled();
      });
    });
  });

  describe('Template Caching', () => {
    it('should cache template with correct prefix and TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const template = { id: 'tpl-1', name: 'Welcome' };

      await cacheTemplate('tpl-1', template);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:template:tpl-1',
        CACHE_TTL.LONG,
        JSON.stringify(template)
      );
    });

    it('should get cached template', async () => {
      const template = { id: 'tpl-1', name: 'Welcome' };
      mockRedis.get.mockResolvedValue(JSON.stringify(template));

      const result = await getCachedTemplate('tpl-1');
      expect(result).toEqual(template);
    });

    it('should invalidate template cache and list caches', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.keys.mockResolvedValue(['cache:templates:list:user1:all:1']);

      await invalidateTemplateCache('tpl-1');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:template:tpl-1');
      expect(mockRedis.keys).toHaveBeenCalledWith('cache:templates:list:*');
    });

    it('should cache templates list', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const templates = [{ id: 'tpl-1' }, { id: 'tpl-2' }];

      await cacheTemplatesList('user-1', 'marketing', 1, templates);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:templates:list:user-1:marketing:1',
        CACHE_TTL.MEDIUM,
        JSON.stringify(templates)
      );
    });

    it('should get cached templates list', async () => {
      const templates = [{ id: 'tpl-1' }, { id: 'tpl-2' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(templates));

      const result = await getCachedTemplatesList('user-1', 'marketing', 1);
      expect(result).toEqual(templates);
    });
  });

  describe('Campaign Caching', () => {
    it('should cache campaign', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const campaign = { id: 'camp-1', name: 'Newsletter' };

      await cacheCampaign('camp-1', campaign);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:campaign:camp-1',
        CACHE_TTL.MEDIUM,
        JSON.stringify(campaign)
      );
    });

    it('should get cached campaign', async () => {
      const campaign = { id: 'camp-1', name: 'Newsletter' };
      mockRedis.get.mockResolvedValue(JSON.stringify(campaign));

      const result = await getCachedCampaign('camp-1');
      expect(result).toEqual(campaign);
    });

    it('should invalidate campaign and stats cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      await invalidateCampaignCache('camp-1');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:campaign:camp-1');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:campaign:stats:camp-1');
    });

    it('should cache campaign stats with short TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const stats = { sent: 100, opened: 50, clicked: 25 };

      await cacheCampaignStats('camp-1', stats);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:campaign:stats:camp-1',
        CACHE_TTL.SHORT,
        JSON.stringify(stats)
      );
    });

    it('should get cached campaign stats', async () => {
      const stats = { sent: 100, opened: 50, clicked: 25 };
      mockRedis.get.mockResolvedValue(JSON.stringify(stats));

      const result = await getCachedCampaignStats('camp-1');
      expect(result).toEqual(stats);
    });
  });

  describe('User Caching', () => {
    it('should cache user with extended TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const user = { id: 'user-1', email: 'test@example.com' };

      await cacheUser('user-1', user);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:user:user-1',
        CACHE_TTL.EXTENDED,
        JSON.stringify(user)
      );
    });

    it('should get cached user', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      mockRedis.get.mockResolvedValue(JSON.stringify(user));

      const result = await getCachedUser('user-1');
      expect(result).toEqual(user);
    });

    it('should invalidate user cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      await invalidateUserCache('user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:user:user-1');
    });
  });

  describe('Session Caching', () => {
    it('should cache session with extended TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const session = { userId: 'user-1', role: 'admin' };

      await cacheSession('sess-token-123', session);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:session:sess-token-123',
        CACHE_TTL.EXTENDED,
        JSON.stringify(session)
      );
    });

    it('should get cached session', async () => {
      const session = { userId: 'user-1', role: 'admin' };
      mockRedis.get.mockResolvedValue(JSON.stringify(session));

      const result = await getCachedSession('sess-token-123');
      expect(result).toEqual(session);
    });

    it('should invalidate session cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      await invalidateSessionCache('sess-token-123');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:session:sess-token-123');
    });
  });

  describe('Cache Stats', () => {
    it('should return cache statistics', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedis.info.mockResolvedValue('used_memory_human:1.5M\n');

      const stats = await getCacheStats();

      expect(stats.available).toBe(true);
      expect(stats.keyCount).toBe(3);
      expect(stats.memoryUsage).toBe('1.5M');
    });
  });
});
