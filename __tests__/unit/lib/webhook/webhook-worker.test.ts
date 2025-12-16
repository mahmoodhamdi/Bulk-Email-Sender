import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Worker class
const mockWorkerInstance = {
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn(),
  isPaused: vi.fn().mockReturnValue(false),
  isRunning: vi.fn().mockReturnValue(true),
  opts: { concurrency: 5 },
};

const MockWorker = vi.fn(() => mockWorkerInstance);

// Mock bullmq
vi.mock('bullmq', () => ({
  Worker: MockWorker,
  Job: vi.fn(),
}));

// Mock Redis connection
vi.mock('@/lib/queue/redis', () => ({
  createRedisConnection: vi.fn(() => ({})),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    webhookDelivery: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock webhook queue
vi.mock('@/lib/webhook/webhook-queue', () => ({
  scheduleWebhookRetry: vi.fn().mockResolvedValue(undefined),
}));

// Mock signature
vi.mock('@/lib/webhook/signature', () => ({
  buildAuthHeaders: vi.fn(() => ({ 'X-Custom-Header': 'test' })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Now import the module under test
import {
  startWebhookWorker,
  stopWebhookWorker,
  pauseWebhookWorker,
  resumeWebhookWorker,
  getWebhookWorkerStatus,
  isWebhookWorkerHealthy,
} from '@/lib/webhook/webhook-worker';

describe('Webhook Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the worker state by reimporting
    vi.resetModules();
  });

  afterEach(async () => {
    // Clean up worker after each test
    try {
      const { stopWebhookWorker: stop } = await import('@/lib/webhook/webhook-worker');
      await stop();
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('startWebhookWorker', () => {
    it('should create a new worker instance', async () => {
      vi.resetModules();

      // Re-mock after reset
      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start } = await import('@/lib/webhook/webhook-worker');
      const worker = start();

      expect(worker).toBeDefined();
      expect(MockWorker).toHaveBeenCalled();
    });

    it('should return same worker on subsequent calls', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start } = await import('@/lib/webhook/webhook-worker');
      const worker1 = start();
      const worker2 = start();

      expect(worker1).toBe(worker2);
    });

    it('should use default config when none provided', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start } = await import('@/lib/webhook/webhook-worker');
      start();

      expect(MockWorker).toHaveBeenCalledWith(
        'webhook-delivery',
        expect.any(Function),
        expect.objectContaining({
          concurrency: expect.any(Number),
        })
      );
    });

    it('should register event handlers', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start } = await import('@/lib/webhook/webhook-worker');
      start();

      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('stalled', expect.any(Function));
    });
  });

  describe('stopWebhookWorker', () => {
    it('should close worker when running', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start, stopWebhookWorker: stop } = await import('@/lib/webhook/webhook-worker');
      start();
      await stop();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
    });

    it('should handle case when no worker is running', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { stopWebhookWorker: stop } = await import('@/lib/webhook/webhook-worker');

      // Should not throw when no worker is running
      await expect(stop()).resolves.not.toThrow();
    });
  });

  describe('pauseWebhookWorker', () => {
    it('should pause running worker', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start, pauseWebhookWorker: pause } = await import('@/lib/webhook/webhook-worker');
      start();
      await pause();

      expect(mockWorkerInstance.pause).toHaveBeenCalled();
    });

    it('should handle case when no worker is running', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { pauseWebhookWorker: pause } = await import('@/lib/webhook/webhook-worker');

      // Should not throw when no worker is running
      await expect(pause()).resolves.not.toThrow();
    });
  });

  describe('resumeWebhookWorker', () => {
    it('should resume paused worker', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start, resumeWebhookWorker: resume } = await import('@/lib/webhook/webhook-worker');
      start();
      await resume();

      expect(mockWorkerInstance.resume).toHaveBeenCalled();
    });

    it('should handle case when no worker is running', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { resumeWebhookWorker: resume } = await import('@/lib/webhook/webhook-worker');

      // Should not throw when no worker is running
      await expect(resume()).resolves.not.toThrow();
    });
  });

  describe('getWebhookWorkerStatus', () => {
    it('should return status when worker is running', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start, getWebhookWorkerStatus: getStatus } = await import('@/lib/webhook/webhook-worker');
      start();
      const status = getStatus();

      expect(status).toEqual({
        running: true,
        paused: false,
        concurrency: 5,
      });
    });

    it('should return not running when no worker', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { getWebhookWorkerStatus: getStatus } = await import('@/lib/webhook/webhook-worker');
      const status = getStatus();

      expect(status).toEqual({
        running: false,
        paused: false,
        concurrency: 0,
      });
    });

    it('should return paused status when worker is paused', async () => {
      vi.resetModules();

      // Create a local mock with isPaused returning true
      const pausedWorkerInstance = {
        ...mockWorkerInstance,
        isPaused: vi.fn().mockReturnValue(true),
      };

      vi.doMock('bullmq', () => ({
        Worker: vi.fn(() => pausedWorkerInstance),
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start, getWebhookWorkerStatus: getStatus } = await import('@/lib/webhook/webhook-worker');
      start();
      const status = getStatus();

      expect(status.paused).toBe(true);
      expect(status.running).toBe(false);
    });
  });

  describe('isWebhookWorkerHealthy', () => {
    it('should return true when worker is running', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start, isWebhookWorkerHealthy: isHealthy } = await import('@/lib/webhook/webhook-worker');
      start();
      const healthy = await isHealthy();

      expect(healthy).toBe(true);
    });

    it('should return false when no worker', async () => {
      vi.resetModules();

      vi.doMock('bullmq', () => ({
        Worker: MockWorker,
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { isWebhookWorkerHealthy: isHealthy } = await import('@/lib/webhook/webhook-worker');
      const healthy = await isHealthy();

      expect(healthy).toBe(false);
    });

    it('should return false when isRunning throws', async () => {
      vi.resetModules();

      const errorWorkerInstance = {
        ...mockWorkerInstance,
        isRunning: vi.fn().mockImplementation(() => {
          throw new Error('Connection lost');
        }),
      };

      vi.doMock('bullmq', () => ({
        Worker: vi.fn(() => errorWorkerInstance),
        Job: vi.fn(),
      }));
      vi.doMock('@/lib/queue/redis', () => ({
        createRedisConnection: vi.fn(() => ({})),
      }));

      const { startWebhookWorker: start, isWebhookWorkerHealthy: isHealthy } = await import('@/lib/webhook/webhook-worker');
      start();
      const healthy = await isHealthy();

      expect(healthy).toBe(false);
    });
  });
});
