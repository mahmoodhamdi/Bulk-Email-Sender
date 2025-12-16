import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Capture the processor function
let capturedProcessor: ((job: unknown) => Promise<unknown>) | null = null;

// Store event handlers
const eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

// Mock Worker from bullmq
const mockWorker = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!eventHandlers[event]) {
      eventHandlers[event] = [];
    }
    eventHandlers[event].push(handler);
    return mockWorker;
  }),
  close: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  isPaused: vi.fn().mockReturnValue(false),
  isRunning: vi.fn().mockReturnValue(true),
  opts: { concurrency: 5 },
};

vi.mock('bullmq', () => ({
  Worker: vi.fn((queueName: string, processor: (job: unknown) => Promise<unknown>, options: unknown) => {
    capturedProcessor = processor;
    return mockWorker;
  }),
}));

// Mock redis
vi.mock('@/lib/queue/redis', () => ({
  createRedisConnection: vi.fn(() => ({})),
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    recipient: {
      update: vi.fn(),
    },
    smtpConfig: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    emailEvent: {
      create: vi.fn(),
    },
    campaign: {
      update: vi.fn(),
    },
  },
}));

// Mock email sender
vi.mock('@/lib/email/sender', () => ({
  createEmailSender: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({ messageId: 'msg-123', success: true }),
    close: vi.fn(),
  })),
}));

// Mock merge tags
vi.mock('@/lib/email/merge-tags', () => ({
  replaceMergeTags: vi.fn((template) => template),
  generateUnsubscribeLink: vi.fn(() => 'http://unsubscribe'),
  generateTrackingPixel: vi.fn(() => '<img src="tracking" />'),
  wrapLinksForTracking: vi.fn((content) => content),
}));

import { Worker } from 'bullmq';

describe('Email Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProcessor = null;
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('startEmailWorker', () => {
    it('should create a worker instance', async () => {
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      const worker = startEmailWorker();
      expect(worker).toBeDefined();
      expect(Worker).toHaveBeenCalledWith(
        'email-queue',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should register event handlers', async () => {
      vi.resetModules();
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('stalled', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('progress', expect.any(Function));
    });

    it('should return same worker instance on subsequent calls', async () => {
      vi.resetModules();
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      const worker1 = startEmailWorker();
      const worker2 = startEmailWorker();
      expect(worker1).toBe(worker2);
    });

    it('should support custom config', async () => {
      vi.resetModules();
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker({ concurrency: 10 });
      expect(Worker).toHaveBeenCalledWith(
        'email-queue',
        expect.any(Function),
        expect.objectContaining({ concurrency: 10 })
      );
    });
  });

  describe('stopEmailWorker', () => {
    it('should close the worker', async () => {
      vi.resetModules();
      const { startEmailWorker, stopEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      await stopEmailWorker();
      expect(mockWorker.close).toHaveBeenCalled();
    });

    it('should not throw if no worker exists', async () => {
      vi.resetModules();
      const { stopEmailWorker } = await import('@/lib/queue/email-worker');
      await expect(stopEmailWorker()).resolves.not.toThrow();
    });
  });

  describe('pauseEmailWorker', () => {
    it('should pause the worker', async () => {
      vi.resetModules();
      const { startEmailWorker, pauseEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      await pauseEmailWorker();
      expect(mockWorker.pause).toHaveBeenCalled();
    });

    it('should not throw if no worker exists', async () => {
      vi.resetModules();
      const { pauseEmailWorker } = await import('@/lib/queue/email-worker');
      await expect(pauseEmailWorker()).resolves.not.toThrow();
    });
  });

  describe('resumeEmailWorker', () => {
    it('should resume the worker', async () => {
      vi.resetModules();
      const { startEmailWorker, resumeEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      await resumeEmailWorker();
      expect(mockWorker.resume).toHaveBeenCalled();
    });

    it('should not throw if no worker exists', async () => {
      vi.resetModules();
      const { resumeEmailWorker } = await import('@/lib/queue/email-worker');
      await expect(resumeEmailWorker()).resolves.not.toThrow();
    });
  });

  describe('getWorkerStatus', () => {
    it('should return running status when worker exists', async () => {
      vi.resetModules();
      mockWorker.isPaused.mockReturnValue(false);
      const { startEmailWorker, getWorkerStatus } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      const status = getWorkerStatus();
      expect(status.running).toBe(true);
      expect(status.paused).toBe(false);
      expect(status.concurrency).toBe(5);
    });

    it('should return paused status when worker is paused', async () => {
      vi.resetModules();
      mockWorker.isPaused.mockReturnValue(true);
      const { startEmailWorker, getWorkerStatus } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      const status = getWorkerStatus();
      expect(status.running).toBe(false);
      expect(status.paused).toBe(true);
    });

    it('should return not running when no worker', async () => {
      vi.resetModules();
      const { getWorkerStatus } = await import('@/lib/queue/email-worker');
      const status = getWorkerStatus();
      expect(status.running).toBe(false);
      expect(status.paused).toBe(false);
      expect(status.concurrency).toBe(0);
    });
  });

  describe('isWorkerHealthy', () => {
    it('should return true when worker is running', async () => {
      vi.resetModules();
      mockWorker.isRunning.mockReturnValue(true);
      const { startEmailWorker, isWorkerHealthy } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      const healthy = await isWorkerHealthy();
      expect(healthy).toBe(true);
    });

    it('should return false when no worker exists', async () => {
      vi.resetModules();
      const { isWorkerHealthy } = await import('@/lib/queue/email-worker');
      const healthy = await isWorkerHealthy();
      expect(healthy).toBe(false);
    });

    it('should return false when isRunning throws', async () => {
      vi.resetModules();
      mockWorker.isRunning.mockImplementation(() => {
        throw new Error('Worker error');
      });
      const { startEmailWorker, isWorkerHealthy } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      const healthy = await isWorkerHealthy();
      expect(healthy).toBe(false);
    });
  });

  describe('Event Handlers', () => {
    it('should handle completed event with success', async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();

      // Trigger completed event
      if (eventHandlers['completed']) {
        eventHandlers['completed'].forEach(handler => {
          handler({ id: 'job-1' }, { success: true });
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle completed event with failure', async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();

      // Trigger completed event with failure
      if (eventHandlers['completed']) {
        eventHandlers['completed'].forEach(handler => {
          handler({ id: 'job-1' }, { success: false });
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle failed event', async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();

      // Trigger failed event
      if (eventHandlers['failed']) {
        eventHandlers['failed'].forEach(handler => {
          handler({ id: 'job-1', attemptsMade: 3 }, new Error('Test error'));
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle failed event with null job', async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();

      // Trigger failed event with null job
      if (eventHandlers['failed']) {
        eventHandlers['failed'].forEach(handler => {
          handler(null, new Error('Test error'));
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle error event', async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();

      // Trigger error event
      if (eventHandlers['error']) {
        eventHandlers['error'].forEach(handler => {
          handler(new Error('Worker error'));
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle stalled event', async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();

      // Trigger stalled event
      if (eventHandlers['stalled']) {
        eventHandlers['stalled'].forEach(handler => {
          handler('job-123');
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle progress event', async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();

      // Trigger progress event
      if (eventHandlers['progress']) {
        eventHandlers['progress'].forEach(handler => {
          handler({ id: 'job-1' }, 50);
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('processEmailJob via captured processor', () => {
    it('should capture the processor function', async () => {
      vi.resetModules();
      const { startEmailWorker } = await import('@/lib/queue/email-worker');
      startEmailWorker();
      expect(capturedProcessor).toBeDefined();
      expect(typeof capturedProcessor).toBe('function');
    });
  });
});
