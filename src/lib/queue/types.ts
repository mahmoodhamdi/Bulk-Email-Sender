import type { JobsOptions } from 'bullmq';

/**
 * Email job data structure
 */
export interface EmailJobData {
  recipientId: string;
  campaignId: string;
  email: string;
  subject: string;
  content: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  trackingId: string;
  smtpConfigId?: string;
  variantId?: string; // A/B test variant ID
  mergeData: {
    firstName?: string;
    lastName?: string;
    email: string;
    company?: string;
    customField1?: string;
    customField2?: string;
  };
}

/**
 * Email job result
 */
export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipientId: string;
  campaignId: string;
  sentAt?: Date;
}

/**
 * Campaign send job data
 */
export interface CampaignSendJobData {
  campaignId: string;
  batchSize: number;
  startIndex: number;
}

/**
 * Queue configuration options
 */
export interface QueueConfig {
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
  rateLimitMax: number;
  rateLimitDuration: number;
}

/**
 * Default queue configuration
 */
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  concurrency: 5,
  maxRetries: 3,
  retryDelay: 60000, // 1 minute
  rateLimitMax: 10,
  rateLimitDuration: 1000, // 1 second (10 emails per second)
};

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  CAMPAIGN: 'campaign-queue',
} as const;

/**
 * Job priorities
 */
export const JOB_PRIORITIES = {
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
} as const;

/**
 * Default job options
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 60000, // Start with 1 minute, exponentially increase
  },
  removeOnComplete: {
    age: 24 * 60 * 60, // Keep completed jobs for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
  },
};

/**
 * Queue event types
 */
export type QueueEventType =
  | 'completed'
  | 'failed'
  | 'progress'
  | 'active'
  | 'waiting'
  | 'delayed'
  | 'stalled';

/**
 * Queue statistics
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Campaign queue status
 */
export interface CampaignQueueStatus {
  campaignId: string;
  totalRecipients: number;
  queued: number;
  sent: number;
  failed: number;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'paused' | 'failed';
  estimatedCompletion?: Date;
}

/**
 * SMTP provider rate limits (emails per minute)
 */
export const SMTP_RATE_LIMITS: Record<string, number> = {
  gmail: 100,
  outlook: 300,
  yahoo: 100,
  sendgrid: 600,
  mailgun: 600,
  ses: 200,
  zoho: 150,
  custom: 60, // Conservative default for custom SMTP
};

/**
 * Get rate limit for SMTP provider
 */
export function getSmtpRateLimit(provider: string): number {
  return SMTP_RATE_LIMITS[provider.toLowerCase()] || SMTP_RATE_LIMITS.custom;
}
