import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock ioredis
const mockRedisInstance = {
  on: vi.fn().mockReturnThis(),
  ping: vi.fn(),
  quit: vi.fn(),
  status: 'ready',
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedisInstance),
}));

// Import after mocking
import {
  getQueueConnection,
  createRedisConnection,
  checkRedisHealth,
  closeRedisConnections,
  getRedisStatus,
} from '@/lib/queue/redis';

describe('Redis Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module to clear singleton state
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getQueueConnection', () => {
    it('should create a Redis connection', async () => {
      // Re-import to get fresh state
      const { getQueueConnection: getConn } = await import('@/lib/queue/redis');
      const connection = getConn();
      expect(connection).toBeDefined();
    });

    it('should register event handlers', async () => {
      const { getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should reuse existing connection', async () => {
      const { getQueueConnection: getConn } = await import('@/lib/queue/redis');
      const conn1 = getConn();
      const conn2 = getConn();
      expect(conn1).toBe(conn2);
    });
  });

  describe('createRedisConnection', () => {
    it('should create a new Redis connection', async () => {
      const { createRedisConnection: createConn } = await import('@/lib/queue/redis');
      const connection = createConn();
      expect(connection).toBeDefined();
    });

    it('should register error handler', async () => {
      const { createRedisConnection: createConn } = await import('@/lib/queue/redis');
      createConn();
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('checkRedisHealth', () => {
    it('should return connected status on successful ping', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
      const { checkRedisHealth: checkHealth, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn(); // Initialize connection
      const result = await checkHealth();
      expect(result.connected).toBe(true);
      expect(result.latency).toBeDefined();
    });

    it('should return error on ping failure', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection refused'));
      vi.resetModules();
      const { checkRedisHealth: checkHealth, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      const result = await checkHealth();
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      mockRedisInstance.ping.mockRejectedValue('Unknown error');
      vi.resetModules();
      const { checkRedisHealth: checkHealth, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      const result = await checkHealth();
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('closeRedisConnections', () => {
    it('should close the connection if it exists', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');
      const { closeRedisConnections: closeConn, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn(); // Initialize connection
      await closeConn();
      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should not throw if no connection exists', async () => {
      vi.resetModules();
      const { closeRedisConnections: closeConn } = await import('@/lib/queue/redis');
      await expect(closeConn()).resolves.not.toThrow();
    });
  });

  describe('getRedisStatus', () => {
    it('should return disconnected when no connection', async () => {
      vi.resetModules();
      const { getRedisStatus: getStatus } = await import('@/lib/queue/redis');
      const status = getStatus();
      expect(status).toBe('disconnected');
    });

    it('should return connected when status is ready', async () => {
      mockRedisInstance.status = 'ready';
      const { getRedisStatus: getStatus, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      const status = getStatus();
      expect(status).toBe('connected');
    });

    it('should return connecting when status is connecting', async () => {
      vi.resetModules();
      const newMock = { ...mockRedisInstance, status: 'connecting' };
      vi.doMock('ioredis', () => ({ default: vi.fn(() => newMock) }));
      const { getRedisStatus: getStatus, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      const status = getStatus();
      expect(status).toBe('connecting');
    });

    it('should return connecting when status is reconnecting', async () => {
      vi.resetModules();
      const newMock = { ...mockRedisInstance, status: 'reconnecting' };
      vi.doMock('ioredis', () => ({ default: vi.fn(() => newMock) }));
      const { getRedisStatus: getStatus, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      const status = getStatus();
      expect(status).toBe('connecting');
    });

    it('should return disconnected for other statuses', async () => {
      vi.resetModules();
      const newMock = { ...mockRedisInstance, status: 'end' };
      vi.doMock('ioredis', () => ({ default: vi.fn(() => newMock) }));
      const { getRedisStatus: getStatus, getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      const status = getStatus();
      expect(status).toBe('disconnected');
    });
  });

  describe('parseRedisUrl', () => {
    it('should parse REDIS_URL with password', async () => {
      vi.resetModules();
      vi.stubEnv('REDIS_URL', 'redis://:mypassword@localhost:6380/1');
      const Redis = (await import('ioredis')).default;
      const { getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
        host: 'localhost',
        port: 6380,
        password: 'mypassword',
        db: 1,
        maxRetriesPerRequest: null,
      }));
    });

    it('should use individual env vars when no REDIS_URL', async () => {
      vi.resetModules();
      vi.stubEnv('REDIS_HOST', 'redis.example.com');
      vi.stubEnv('REDIS_PORT', '6381');
      vi.stubEnv('REDIS_PASSWORD', 'secret');
      vi.stubEnv('REDIS_DB', '2');
      const Redis = (await import('ioredis')).default;
      const { getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
        host: 'redis.example.com',
        port: 6381,
        password: 'secret',
        db: 2,
      }));
    });

    it('should use defaults when no env vars set', async () => {
      vi.resetModules();
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      const Redis = (await import('ioredis')).default;
      const { getQueueConnection: getConn } = await import('@/lib/queue/redis');
      getConn();
      expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
        host: 'localhost',
        port: 6379,
        db: 0,
      }));
    });
  });
});
