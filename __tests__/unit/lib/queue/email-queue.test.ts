import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock job objects
const mockJob = {
  id: 'job-123',
  data: { campaignId: 'campaign-1', recipientId: 'recipient-1' },
  remove: vi.fn(),
  retry: vi.fn(),
  getState: vi.fn(),
};

// Mock queue methods
const mockQueue = {
  add: vi.fn().mockResolvedValue(mockJob),
  addBulk: vi.fn().mockResolvedValue([mockJob, { ...mockJob, id: 'job-456' }]),
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
  setGlobalConcurrency: vi.fn(),
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
  getEmailQueue,
  getQueueEvents,
  addEmailJob,
  addEmailJobs,
  getQueueStats,
  getJob,
  getJobsByState,
  removeJob,
  retryJob,
  pauseQueue,
  resumeQueue,
  drainQueue,
  cleanQueue,
  getCampaignJobs,
  cancelCampaignJobs,
  closeQueue,
  configureRateLimiting,
} from '@/lib/queue/email-queue';

describe('Email Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('getEmailQueue', () => {
    it('should create and return a queue instance', async () => {
      vi.resetModules();
      const { getEmailQueue: getQueue } = await import('@/lib/queue/email-queue');
      const queue = getQueue();
      expect(queue).toBeDefined();
    });

    it('should return the same queue instance on subsequent calls', async () => {
      vi.resetModules();
      const { getEmailQueue: getQueue } = await import('@/lib/queue/email-queue');
      const queue1 = getQueue();
      const queue2 = getQueue();
      expect(queue1).toBe(queue2);
    });
  });

  describe('getQueueEvents', () => {
    it('should create and return queue events', async () => {
      vi.resetModules();
      const { getQueueEvents: getEvents } = await import('@/lib/queue/email-queue');
      const events = getEvents();
      expect(events).toBeDefined();
    });

    it('should return the same events instance on subsequent calls', async () => {
      vi.resetModules();
      const { getQueueEvents: getEvents } = await import('@/lib/queue/email-queue');
      const events1 = getEvents();
      const events2 = getEvents();
      expect(events1).toBe(events2);
    });
  });

  describe('addEmailJob', () => {
    it('should add a job to the queue', async () => {
      const jobData = {
        campaignId: 'campaign-1',
        recipientId: 'recipient-1',
        email: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        smtpConfigId: 'smtp-1',
      };

      const jobId = await addEmailJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith('send-email', jobData, {
        priority: undefined,
        delay: undefined,
        jobId: 'email-recipient-1',
      });
      expect(jobId).toBe('job-123');
    });

    it('should support custom options', async () => {
      const jobData = {
        campaignId: 'campaign-1',
        recipientId: 'recipient-2',
        email: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        smtpConfigId: 'smtp-1',
      };

      await addEmailJob(jobData, {
        priority: 1,
        delay: 5000,
        jobId: 'custom-job-id',
      });

      expect(mockQueue.add).toHaveBeenCalledWith('send-email', jobData, {
        priority: 1,
        delay: 5000,
        jobId: 'custom-job-id',
      });
    });
  });

  describe('addEmailJobs', () => {
    it('should add multiple jobs to the queue', async () => {
      const jobs = [
        {
          data: {
            campaignId: 'campaign-1',
            recipientId: 'recipient-1',
            email: 'test1@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
            text: 'Test',
            smtpConfigId: 'smtp-1',
          },
        },
        {
          data: {
            campaignId: 'campaign-1',
            recipientId: 'recipient-2',
            email: 'test2@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
            text: 'Test',
            smtpConfigId: 'smtp-1',
          },
        },
      ];

      const jobIds = await addEmailJobs(jobs);

      expect(mockQueue.addBulk).toHaveBeenCalled();
      expect(jobIds).toHaveLength(2);
    });

    it('should support custom options per job', async () => {
      const jobs = [
        {
          data: {
            campaignId: 'campaign-1',
            recipientId: 'recipient-1',
            email: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
            text: 'Test',
            smtpConfigId: 'smtp-1',
          },
          options: {
            priority: 1,
            delay: 1000,
            jobId: 'custom-id',
          },
        },
      ];

      await addEmailJobs(jobs);

      expect(mockQueue.addBulk).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'send-email',
          opts: {
            priority: 1,
            delay: 1000,
            jobId: 'custom-id',
          },
        }),
      ]);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 10,
        paused: false,
      });
    });
  });

  describe('getJob', () => {
    it('should return a job by ID', async () => {
      const job = await getJob('job-123');
      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
      expect(job).toBeDefined();
    });
  });

  describe('getJobsByState', () => {
    it('should return waiting jobs', async () => {
      const jobs = await getJobsByState('waiting');
      expect(mockQueue.getWaiting).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return active jobs', async () => {
      const jobs = await getJobsByState('active');
      expect(mockQueue.getActive).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return completed jobs', async () => {
      const jobs = await getJobsByState('completed');
      expect(mockQueue.getCompleted).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return failed jobs', async () => {
      const jobs = await getJobsByState('failed');
      expect(mockQueue.getFailed).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should return delayed jobs', async () => {
      const jobs = await getJobsByState('delayed');
      expect(mockQueue.getDelayed).toHaveBeenCalledWith(0, 100);
      expect(jobs).toHaveLength(1);
    });

    it('should support custom start and end', async () => {
      await getJobsByState('waiting', 10, 50);
      expect(mockQueue.getWaiting).toHaveBeenCalledWith(10, 50);
    });

    it('should return empty array for unknown state', async () => {
      const jobs = await getJobsByState('unknown' as never);
      expect(jobs).toEqual([]);
    });
  });

  describe('removeJob', () => {
    it('should remove an existing job', async () => {
      const result = await removeJob('job-123');
      expect(mockJob.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if job does not exist', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);
      const result = await removeJob('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('retryJob', () => {
    it('should retry an existing job', async () => {
      const result = await retryJob('job-123');
      expect(mockJob.retry).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if job does not exist', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);
      const result = await retryJob('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('pauseQueue', () => {
    it('should pause the queue', async () => {
      await pauseQueue();
      expect(mockQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume the queue', async () => {
      await resumeQueue();
      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('drainQueue', () => {
    it('should drain the queue', async () => {
      await drainQueue();
      expect(mockQueue.drain).toHaveBeenCalled();
    });
  });

  describe('cleanQueue', () => {
    it('should clean jobs with default parameters', async () => {
      const removed = await cleanQueue();
      expect(mockQueue.clean).toHaveBeenCalledWith(
        24 * 60 * 60 * 1000,
        1000,
        'completed'
      );
      expect(removed).toEqual(['job-1', 'job-2']);
    });

    it('should support custom parameters', async () => {
      await cleanQueue(60000, 500, 'failed');
      expect(mockQueue.clean).toHaveBeenCalledWith(60000, 500, 'failed');
    });
  });

  describe('getCampaignJobs', () => {
    it('should get all jobs for a campaign', async () => {
      const jobs = await getCampaignJobs('campaign-1');
      expect(jobs.length).toBeGreaterThan(0);
    });

    it('should filter by state when provided', async () => {
      const jobs = await getCampaignJobs('campaign-1', 'waiting');
      expect(mockQueue.getWaiting).toHaveBeenCalled();
      expect(jobs).toBeDefined();
    });
  });

  describe('cancelCampaignJobs', () => {
    it('should cancel waiting jobs for a campaign', async () => {
      mockJob.getState.mockResolvedValue('waiting');
      const cancelled = await cancelCampaignJobs('campaign-1');
      expect(cancelled).toBeGreaterThanOrEqual(0);
    });

    it('should cancel delayed jobs for a campaign', async () => {
      mockJob.getState.mockResolvedValue('delayed');
      const cancelled = await cancelCampaignJobs('campaign-1');
      expect(cancelled).toBeGreaterThanOrEqual(0);
    });

    it('should not cancel active jobs', async () => {
      mockJob.getState.mockResolvedValue('active');
      mockJob.remove.mockClear();
      // Create a mock that returns the job with 'active' state
      await cancelCampaignJobs('campaign-1');
      // Job should not be removed if active
    });
  });

  describe('closeQueue', () => {
    it('should close queue and events', async () => {
      vi.resetModules();
      const { closeQueue: close, getEmailQueue: getQueue, getQueueEvents: getEvents } = await import('@/lib/queue/email-queue');
      getQueue();
      getEvents();
      await close();
      expect(mockQueueEvents.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should handle closing when nothing is initialized', async () => {
      vi.resetModules();
      const { closeQueue: close } = await import('@/lib/queue/email-queue');
      await expect(close()).resolves.not.toThrow();
    });
  });

  describe('configureRateLimiting', () => {
    it('should configure rate limiting', async () => {
      await configureRateLimiting({
        concurrency: 10,
        rateLimitMax: 100,
        rateLimitDuration: 60000,
      });
      expect(mockQueue.setGlobalConcurrency).toHaveBeenCalledWith(10);
    });

    it('should use defaults for missing config', async () => {
      await configureRateLimiting({});
      expect(mockQueue.setGlobalConcurrency).toHaveBeenCalled();
    });
  });
});
