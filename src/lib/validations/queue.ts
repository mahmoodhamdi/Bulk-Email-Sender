import { z } from 'zod';

/**
 * Send campaign request schema
 */
export const sendCampaignSchema = z.object({
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional().default('NORMAL'),
  batchSize: z.number().int().min(1).max(1000).optional().default(100),
  delayBetweenBatches: z.number().int().min(0).max(60000).optional().default(0),
  smtpConfigId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type SendCampaignInput = z.infer<typeof sendCampaignSchema>;

/**
 * Queue action schema (pause, resume, cancel)
 */
export const queueActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel', 'retry']),
});

export type QueueActionInput = z.infer<typeof queueActionSchema>;

/**
 * Queue stats query schema
 */
export const queueStatsQuerySchema = z.object({
  includeJobs: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
  state: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']).optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 100)),
});

export type QueueStatsQuery = z.infer<typeof queueStatsQuerySchema>;

/**
 * Worker control schema
 */
export const workerControlSchema = z.object({
  action: z.enum(['start', 'stop', 'pause', 'resume']),
  config: z.object({
    concurrency: z.number().int().min(1).max(50).optional(),
    rateLimitMax: z.number().int().min(1).max(100).optional(),
    rateLimitDuration: z.number().int().min(100).max(60000).optional(),
  }).optional(),
});

export type WorkerControlInput = z.infer<typeof workerControlSchema>;

/**
 * Clean queue schema
 */
export const cleanQueueSchema = z.object({
  gracePeriod: z.number().int().min(0).optional().default(24 * 60 * 60 * 1000), // 24 hours
  limit: z.number().int().min(1).max(10000).optional().default(1000),
  status: z.enum(['completed', 'failed', 'delayed', 'wait']).optional().default('completed'),
});

export type CleanQueueInput = z.infer<typeof cleanQueueSchema>;
