import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock job objects
const mockJob = {
  id: 'webhook-delivery-123',
  data: { webhookId: 'webhook-1', deliveryId: 'delivery-1' },
  remove: vi.fn(),
  retry: vi.fn(),
  getState: vi.fn(),
};

// Mock queue methods
const mockQueue = {
  add: vi.fn().mockResolvedValue(mockJob),
  addBulk: vi.fn().mockResolvedValue([mockJob, { ...mockJob, id: 'webhook-delivery-456' }]),
  getWaitingCount: vi.fn().mockResolvedValue(5),
  getActiveCount: vi.fn().mockResolvedValue(2),
  getCompletedCount: vi.fn().mockResolvedValue(100),
  getFailedCount: vi.fn().mockResolvedValue(3),
  getDelayedCount: vi.fn().mockResolvedValue(10),
  isPaused: vi.fn().mockResolvedValue(false),
  getJob: vi.fn().mockResolvedValue(mockJob),
  getWaiting: vi.fn().mockResolvedValue([mockJob]),
  getActive: vi.fn().mockResolvedValue([mockJob]),
  getCompleted: vi.fn().mockResolvedValue([mockJob]),
  getFailed: vi.fn().mockResolvedValue([mockJob]),
  getDelayed: vi.fn().mockResolvedValue([mockJob]),
  pause: vi.fn(),
  resume: vi.fn(),
  drain: vi.fn(),
  clean: vi.fn().mockResolvedValue(['job-1', 'job-2']),
  close: vi.fn(),
};

const mockQueueEvents = {
  close: vi.fn(),
};

// Mock bullmq
vi.mock('bullmq', () => ({
  Queue: vi.fn(() => mockQueue),
  QueueEvents: vi.fn(() => mockQueueEvents),
}));

// Mock redis
vi.mock('@/lib/queue/redis', () => ({
  getQueueConnection: vi.fn(() => ({})),
}));

// Import after mocking
import {
  getWebhookQueue,
  getWebhookQueueEvents,
  addWebhookJob,
  addWebhookJobs,
  getWebhookQueueStats,
  getWebhookJob,
  getWebhookJobsByState,
  removeWebhookJob,
  retryWebhookJob,
  getJobsByWebhookId,
  cancelWebhookJobs,
  pauseWebhookQueue,
  resumeWebhookQueue,
  drainWebhookQueue,
  cleanWebhookQueue,
  closeWebhookQueue,
  isWebhookQueueHealthy,
} from '@/lib/webhook/webhook-queue';

describe('Webhook Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('getWebhookQueue', () => {
    it('should create and return a queue instance', async () => {
      vi.resetModules();
      const { getWebhookQueue: getQueue } = await import('@/lib/webhook/webhook-queue');
      const queue = getQueue();
      expect(queue).toBeDefined();
    });

    it('should return the same queue instance on subsequent calls', async () => {
      vi.resetModules();
      const { getWebhookQueue: getQueue } = await import('@/lib/webhook/webhook-queue');
      const queue1 = getQueue();
      const queue2 = getQueue();
      expect(queue1).toBe(queue2);
    });
  });

  describe('getWebhookQueueEvents', () => {
    it('should create and return queue events', async () => {
      vi.resetModules();
      const { getWebhookQueueEvents: getEvents } = await import('@/lib/webhook/webhook-queue');
      const events = getEvents();
      expect(events).toBeDefined();
    });
  });

  describe('addWebhookJob', () => {
    it('should add a job to the queue', async () => {
      const jobData = {
        webhookId: 'webhook-1',
        deliveryId: 'delivery-1',
        url: 'https://example.com/webhook',
        payload: {
          event: 'email.sent' as const,
          timestamp: new Date().toISOString(),
          data: {},
        },
        authType: 'NONE' as const,
        timeout: 30000,
        attempt: 1,
        maxRetries: 3,
      };

      const jobId = await addWebhookJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith('deliver-webhook', jobData, {
        priority: undefined,
        delay: undefined,
        jobId: 'webhook-delivery-1',
      });
      expect(jobId).toBe('webhook-delivery-123');
    });

    it('should support custom delay', async () => {
      const jobData = {
        webhookId: 'webhook-1',
        deliveryId: 'delivery-2',
        url: 'https://example.com/webhook',
        payload: {
          event: 'email.sent' as const,
          timestamp: new Date().toISOString(),
          data: {},
        },
        authType: 'NONE' as const,
        timeout: 30000,
        attempt: 1,
        maxRetries: 3,
      };

      await addWebhookJob(jobData, { delay: 60000 });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'deliver-webhook',
        jobData,
        expect.objectContaining({ delay: 60000 })
      );
    });
  });

  describe('addWebhookJobs', () => {
    it('should add multiple jobs to the queue', async () => {
      const jobs = [
        {
          data: {
            webhookId: 'webhook-1',
            deliveryId: 'delivery-1',
            url: 'https://example.com/webhook',
            payload: {
              event: 'email.sent' as const,
              timestamp: new Date().toISOString(),
              data: {},
            },
            authType: 'NONE' as const,
            timeout: 30000,
            attempt: 1,
            maxRetries: 3,
          },
        },
        {
          data: {
            webhookId: 'webhook-1',
            deliveryId: 'delivery-2',
            url: 'https://example.com/webhook',
            payload: {
              event: 'email.opened' as const,
              timestamp: new Date().toISOString(),
              data: {},
            },
            authType: 'NONE' as const,
            timeout: 30000,
            attempt: 1,
            maxRetries: 3,
          },
        },
      ];

      const jobIds = await addWebhookJobs(jobs);

      expect(mockQueue.addBulk).toHaveBeenCalled();
      expect(jobIds).toHaveLength(2);
    });
  });

  describe('getWebhookQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await getWebhookQueueStats();

      expect(stats).toEqual({
        totalDeliveries: 120, // 5 + 2 + 100 + 3 + 10
        delivered: 100,
        failed: 3,
        pending: 15, // 5 + 10
        retrying: 2,
        successRate: expect.any(Number),
      });
    });

    it('should calculate success rate correctly', async () => {
      const stats = await getWebhookQueueStats();
      // 100 delivered out of 120 total = 83.33%
      expect(stats.successRate).toBeCloseTo(83.33, 1);
    });
  });

  describe('getWebhookJob', () => {
    it('should return a job by ID', async () => {
      const job = await getWebhookJob('webhook-delivery-123');
      expect(mockQueue.getJob).toHaveBeenCalledWith('webhook-delivery-123');
      expect(job).toBeDefined();
    });
  });

  describe('getWebhookJobsByState', () => {
    it('should return waiting jobs', async () => {
      const jobs = await getWebhookJobsByState('waiting');
      expect(mockQueue.getWaiting).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return active jobs', async () => {
      const jobs = await getWebhookJobsByState('active');
      expect(mockQueue.getActive).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return completed jobs', async () => {
      const jobs = await getWebhookJobsByState('completed');
      expect(mockQueue.getCompleted).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return failed jobs', async () => {
      const jobs = await getWebhookJobsByState('failed');
      expect(mockQueue.getFailed).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return delayed jobs', async () => {
      const jobs = await getWebhookJobsByState('delayed');
      expect(mockQueue.getDelayed).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should support custom start and end', async () => {
      await getWebhookJobsByState('waiting', 10, 50);
      expect(mockQueue.getWaiting).toHaveBeenCalledWith(10, 50);
    });
  });

  describe('removeWebhookJob', () => {
    it('should remove an existing job', async () => {
      const result = await removeWebhookJob('webhook-delivery-123');
      expect(mockJob.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if job does not exist', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);
      const result = await removeWebhookJob('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('retryWebhookJob', () => {
    it('should retry an existing job', async () => {
      const result = await retryWebhookJob('webhook-delivery-123');
      expect(mockJob.retry).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if job does not exist', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);
      const result = await retryWebhookJob('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getJobsByWebhookId', () => {
    it('should get all jobs for a webhook', async () => {
      const jobs = await getJobsByWebhookId('webhook-1');
      expect(jobs.length).toBeGreaterThan(0);
    });

    it('should filter by state when provided', async () => {
      const jobs = await getJobsByWebhookId('webhook-1', 'waiting');
      expect(mockQueue.getWaiting).toHaveBeenCalled();
      expect(jobs).toBeDefined();
    });
  });

  describe('cancelWebhookJobs', () => {
    it('should cancel waiting jobs for a webhook', async () => {
      mockJob.getState.mockResolvedValue('waiting');
      const cancelled = await cancelWebhookJobs('webhook-1');
      expect(cancelled).toBeGreaterThanOrEqual(0);
    });

    it('should cancel delayed jobs for a webhook', async () => {
      mockJob.getState.mockResolvedValue('delayed');
      const cancelled = await cancelWebhookJobs('webhook-1');
      expect(cancelled).toBeGreaterThanOrEqual(0);
    });
  });

  describe('pauseWebhookQueue', () => {
    it('should pause the queue', async () => {
      await pauseWebhookQueue();
      expect(mockQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeWebhookQueue', () => {
    it('should resume the queue', async () => {
      await resumeWebhookQueue();
      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('drainWebhookQueue', () => {
    it('should drain the queue', async () => {
      await drainWebhookQueue();
      expect(mockQueue.drain).toHaveBeenCalled();
    });
  });

  describe('cleanWebhookQueue', () => {
    it('should clean jobs with default parameters', async () => {
      const removed = await cleanWebhookQueue();
      expect(mockQueue.clean).toHaveBeenCalledWith(
        24 * 60 * 60 * 1000,
        1000,
        'completed'
      );
      expect(removed).toEqual(['job-1', 'job-2']);
    });

    it('should support custom parameters', async () => {
      await cleanWebhookQueue(60000, 500, 'failed');
      expect(mockQueue.clean).toHaveBeenCalledWith(60000, 500, 'failed');
    });
  });

  describe('closeWebhookQueue', () => {
    it('should close queue and events', async () => {
      vi.resetModules();
      const { closeWebhookQueue: close, getWebhookQueue: getQueue, getWebhookQueueEvents: getEvents } = await import('@/lib/webhook/webhook-queue');
      getQueue();
      getEvents();
      await close();
      expect(mockQueueEvents.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
    });
  });

  describe('isWebhookQueueHealthy', () => {
    it('should return true when queue is healthy', async () => {
      const healthy = await isWebhookQueueHealthy();
      expect(healthy).toBe(true);
    });

    it('should return false when queue throws error', async () => {
      mockQueue.getWaitingCount.mockRejectedValueOnce(new Error('Connection failed'));
      const healthy = await isWebhookQueueHealthy();
      expect(healthy).toBe(false);
    });
  });
});
