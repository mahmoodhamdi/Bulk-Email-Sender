import { describe, it, expect } from 'vitest';
import {
  sendCampaignSchema,
  queueActionSchema,
  queueStatsQuerySchema,
  workerControlSchema,
  cleanQueueSchema,
} from '@/lib/validations/queue';

describe('Queue Validations', () => {
  describe('sendCampaignSchema', () => {
    it('should accept valid send campaign data with defaults', () => {
      const result = sendCampaignSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('NORMAL');
        expect(result.data.batchSize).toBe(100);
        expect(result.data.delayBetweenBatches).toBe(0);
      }
    });

    it('should accept valid send campaign data with custom values', () => {
      const result = sendCampaignSchema.safeParse({
        priority: 'HIGH',
        batchSize: 50,
        delayBetweenBatches: 1000,
        smtpConfigId: 'clxxxxxxxxxxxxxxxxxx',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('HIGH');
        expect(result.data.batchSize).toBe(50);
        expect(result.data.delayBetweenBatches).toBe(1000);
      }
    });

    it('should accept LOW priority', () => {
      const result = sendCampaignSchema.safeParse({ priority: 'LOW' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('LOW');
      }
    });

    it('should reject invalid priority', () => {
      const result = sendCampaignSchema.safeParse({ priority: 'URGENT' });
      expect(result.success).toBe(false);
    });

    it('should reject batch size less than 1', () => {
      const result = sendCampaignSchema.safeParse({ batchSize: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject batch size greater than 1000', () => {
      const result = sendCampaignSchema.safeParse({ batchSize: 1001 });
      expect(result.success).toBe(false);
    });

    it('should reject negative delay between batches', () => {
      const result = sendCampaignSchema.safeParse({ delayBetweenBatches: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject delay greater than 60000ms', () => {
      const result = sendCampaignSchema.safeParse({ delayBetweenBatches: 60001 });
      expect(result.success).toBe(false);
    });

    it('should accept valid scheduled date', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const result = sendCampaignSchema.safeParse({ scheduledAt: futureDate });
      expect(result.success).toBe(true);
    });

    it('should reject invalid scheduled date format', () => {
      const result = sendCampaignSchema.safeParse({ scheduledAt: 'tomorrow' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid SMTP config ID format', () => {
      const result = sendCampaignSchema.safeParse({ smtpConfigId: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('queueActionSchema', () => {
    it('should accept pause action', () => {
      const result = queueActionSchema.safeParse({ action: 'pause' });
      expect(result.success).toBe(true);
    });

    it('should accept resume action', () => {
      const result = queueActionSchema.safeParse({ action: 'resume' });
      expect(result.success).toBe(true);
    });

    it('should accept cancel action', () => {
      const result = queueActionSchema.safeParse({ action: 'cancel' });
      expect(result.success).toBe(true);
    });

    it('should accept retry action', () => {
      const result = queueActionSchema.safeParse({ action: 'retry' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = queueActionSchema.safeParse({ action: 'start' });
      expect(result.success).toBe(false);
    });

    it('should reject missing action', () => {
      const result = queueActionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('queueStatsQuerySchema', () => {
    it('should accept empty query', () => {
      const result = queueStatsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should transform includeJobs string to boolean', () => {
      const result = queueStatsQuerySchema.safeParse({ includeJobs: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeJobs).toBe(true);
      }
    });

    it('should transform includeJobs false string', () => {
      const result = queueStatsQuerySchema.safeParse({ includeJobs: 'false' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeJobs).toBe(false);
      }
    });

    it('should accept valid state', () => {
      const result = queueStatsQuerySchema.safeParse({ state: 'waiting' });
      expect(result.success).toBe(true);
    });

    it('should accept active state', () => {
      const result = queueStatsQuerySchema.safeParse({ state: 'active' });
      expect(result.success).toBe(true);
    });

    it('should accept completed state', () => {
      const result = queueStatsQuerySchema.safeParse({ state: 'completed' });
      expect(result.success).toBe(true);
    });

    it('should accept failed state', () => {
      const result = queueStatsQuerySchema.safeParse({ state: 'failed' });
      expect(result.success).toBe(true);
    });

    it('should accept delayed state', () => {
      const result = queueStatsQuerySchema.safeParse({ state: 'delayed' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid state', () => {
      const result = queueStatsQuerySchema.safeParse({ state: 'running' });
      expect(result.success).toBe(false);
    });

    it('should transform limit string to number', () => {
      const result = queueStatsQuerySchema.safeParse({ limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should use default limit of 100', () => {
      const result = queueStatsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });
  });

  describe('workerControlSchema', () => {
    it('should accept start action', () => {
      const result = workerControlSchema.safeParse({ action: 'start' });
      expect(result.success).toBe(true);
    });

    it('should accept stop action', () => {
      const result = workerControlSchema.safeParse({ action: 'stop' });
      expect(result.success).toBe(true);
    });

    it('should accept pause action', () => {
      const result = workerControlSchema.safeParse({ action: 'pause' });
      expect(result.success).toBe(true);
    });

    it('should accept resume action', () => {
      const result = workerControlSchema.safeParse({ action: 'resume' });
      expect(result.success).toBe(true);
    });

    it('should accept config with concurrency', () => {
      const result = workerControlSchema.safeParse({
        action: 'start',
        config: { concurrency: 10 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject concurrency less than 1', () => {
      const result = workerControlSchema.safeParse({
        action: 'start',
        config: { concurrency: 0 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject concurrency greater than 50', () => {
      const result = workerControlSchema.safeParse({
        action: 'start',
        config: { concurrency: 51 },
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid rate limit config', () => {
      const result = workerControlSchema.safeParse({
        action: 'start',
        config: {
          rateLimitMax: 20,
          rateLimitDuration: 2000,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject rate limit max less than 1', () => {
      const result = workerControlSchema.safeParse({
        action: 'start',
        config: { rateLimitMax: 0 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject rate limit max greater than 100', () => {
      const result = workerControlSchema.safeParse({
        action: 'start',
        config: { rateLimitMax: 101 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject rate limit duration less than 100ms', () => {
      const result = workerControlSchema.safeParse({
        action: 'start',
        config: { rateLimitDuration: 50 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid action', () => {
      const result = workerControlSchema.safeParse({ action: 'restart' });
      expect(result.success).toBe(false);
    });
  });

  describe('cleanQueueSchema', () => {
    it('should accept empty object with defaults', () => {
      const result = cleanQueueSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gracePeriod).toBe(24 * 60 * 60 * 1000);
        expect(result.data.limit).toBe(1000);
        expect(result.data.status).toBe('completed');
      }
    });

    it('should accept custom grace period', () => {
      const result = cleanQueueSchema.safeParse({ gracePeriod: 3600000 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gracePeriod).toBe(3600000);
      }
    });

    it('should accept custom limit', () => {
      const result = cleanQueueSchema.safeParse({ limit: 500 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(500);
      }
    });

    it('should accept failed status', () => {
      const result = cleanQueueSchema.safeParse({ status: 'failed' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('failed');
      }
    });

    it('should accept delayed status', () => {
      const result = cleanQueueSchema.safeParse({ status: 'delayed' });
      expect(result.success).toBe(true);
    });

    it('should accept wait status', () => {
      const result = cleanQueueSchema.safeParse({ status: 'wait' });
      expect(result.success).toBe(true);
    });

    it('should reject negative grace period', () => {
      const result = cleanQueueSchema.safeParse({ gracePeriod: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const result = cleanQueueSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 10000', () => {
      const result = cleanQueueSchema.safeParse({ limit: 10001 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = cleanQueueSchema.safeParse({ status: 'active' });
      expect(result.success).toBe(false);
    });
  });
});
