import { z } from 'zod';
import type { JobsOptions } from 'bullmq';
import type { WebhookAuthType, WebhookDeliveryStatus } from '@prisma/client';

/**
 * Available webhook events
 */
export const WEBHOOK_EVENTS = {
  // Email events
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_OPENED: 'email.opened',
  EMAIL_CLICKED: 'email.clicked',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_UNSUBSCRIBED: 'email.unsubscribed',
  EMAIL_COMPLAINED: 'email.complained',
  // Campaign events
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_COMPLETED: 'campaign.completed',
  CAMPAIGN_PAUSED: 'campaign.paused',
  // Contact events
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

/**
 * Webhook event descriptions for UI
 */
export const WEBHOOK_EVENT_DETAILS: Record<WebhookEvent, { name: string; description: string }> = {
  'email.sent': { name: 'Email Sent', description: 'Triggered when an email is successfully sent to SMTP' },
  'email.delivered': { name: 'Email Delivered', description: 'Triggered when email delivery is confirmed by provider' },
  'email.opened': { name: 'Email Opened', description: 'Triggered when a recipient opens an email' },
  'email.clicked': { name: 'Link Clicked', description: 'Triggered when a recipient clicks a link in an email' },
  'email.bounced': { name: 'Email Bounced', description: 'Triggered when an email bounces (hard or soft)' },
  'email.unsubscribed': { name: 'Unsubscribed', description: 'Triggered when a recipient unsubscribes' },
  'email.complained': { name: 'Spam Complaint', description: 'Triggered when a recipient marks email as spam' },
  'campaign.started': { name: 'Campaign Started', description: 'Triggered when a campaign begins sending' },
  'campaign.completed': { name: 'Campaign Completed', description: 'Triggered when a campaign finishes sending' },
  'campaign.paused': { name: 'Campaign Paused', description: 'Triggered when a campaign is paused' },
  'contact.created': { name: 'Contact Created', description: 'Triggered when a new contact is added' },
  'contact.updated': { name: 'Contact Updated', description: 'Triggered when contact information is updated' },
};

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: WebhookEventData;
}

/**
 * Webhook event data based on event type
 */
export interface WebhookEventData {
  // Common fields
  campaignId?: string;
  campaignName?: string;
  recipientId?: string;
  contactId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  // Event-specific metadata
  metadata?: Record<string, unknown>;
}

/**
 * Webhook job data for BullMQ
 */
export interface WebhookJobData {
  webhookId: string;
  deliveryId: string;
  url: string;
  payload: WebhookPayload;
  authType: WebhookAuthType;
  authHeader?: string;
  authValue?: string;
  secret?: string;
  timeout: number;
  attempt: number;
  maxRetries: number;
}

/**
 * Webhook job result
 */
export interface WebhookJobResult {
  success: boolean;
  deliveryId: string;
  webhookId: string;
  statusCode?: number;
  response?: string;
  error?: string;
  responseTime?: number;
}

/**
 * Webhook queue configuration
 */
export interface WebhookQueueConfig {
  concurrency: number;
  maxRetries: number;
  rateLimitMax: number;
  rateLimitDuration: number;
  defaultTimeout: number;
}

/**
 * Default webhook queue configuration
 */
export const DEFAULT_WEBHOOK_CONFIG: WebhookQueueConfig = {
  concurrency: parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '10', 10),
  maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
  rateLimitMax: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '100', 10),
  rateLimitDuration: 1000, // 100 per second
  defaultTimeout: parseInt(process.env.WEBHOOK_DEFAULT_TIMEOUT || '30000', 10),
};

/**
 * Queue name for webhooks
 */
export const WEBHOOK_QUEUE_NAME = 'webhook-delivery';

/**
 * Retry delays in milliseconds (exponential backoff)
 */
export const RETRY_DELAYS = [
  60 * 1000,      // 1 minute
  5 * 60 * 1000,  // 5 minutes
  30 * 60 * 1000, // 30 minutes
];

/**
 * Default webhook job options
 */
export const DEFAULT_WEBHOOK_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'custom',
  },
  removeOnComplete: {
    age: 24 * 60 * 60, // Keep completed jobs for 24 hours
    count: 5000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
  },
};

/**
 * Webhook delivery statistics
 */
export interface WebhookStats {
  totalDeliveries: number;
  delivered: number;
  failed: number;
  pending: number;
  retrying: number;
  successRate: number;
  avgResponseTime?: number;
}

// ==================== Zod Schemas ====================

/**
 * Webhook event schema
 */
export const webhookEventSchema = z.enum([
  'email.sent',
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.unsubscribed',
  'email.complained',
  'campaign.started',
  'campaign.completed',
  'campaign.paused',
  'contact.created',
  'contact.updated',
]);

/**
 * Webhook auth type schema
 */
export const webhookAuthTypeSchema = z.enum(['NONE', 'BASIC', 'BEARER', 'API_KEY', 'HMAC']);

/**
 * Base webhook schema (without refinements)
 */
const baseWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  url: z.string().url('Invalid URL format'),
  events: z.array(webhookEventSchema).min(1, 'At least one event is required'),
  secret: z.string().optional(),
  authType: webhookAuthTypeSchema.default('NONE'),
  authHeader: z.string().optional(),
  authValue: z.string().optional(),
  timeout: z.number().min(1000).max(60000).default(30000),
  maxRetries: z.number().min(0).max(10).default(3),
  campaignIds: z.array(z.string()).default([]),
  contactListIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

/**
 * Authentication validation refinement
 */
const authValidationRefinement = (data: { authType?: string; authValue?: string; authHeader?: string; secret?: string }) => {
  // If auth type requires value, ensure it's provided
  if (['BASIC', 'BEARER', 'API_KEY'].includes(data.authType || 'NONE') && !data.authValue) {
    return false;
  }
  // If auth type is API_KEY, ensure header is provided
  if (data.authType === 'API_KEY' && !data.authHeader) {
    return false;
  }
  // If auth type is HMAC, ensure secret is provided
  if (data.authType === 'HMAC' && !data.secret) {
    return false;
  }
  return true;
};

/**
 * Create webhook request schema
 */
export const createWebhookSchema = baseWebhookSchema.refine(
  authValidationRefinement,
  {
    message: 'Authentication configuration is incomplete for the selected auth type',
  }
);

/**
 * Update webhook request schema
 */
export const updateWebhookSchema = baseWebhookSchema.partial();

/**
 * Webhook delivery status schema
 */
export const webhookDeliveryStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'DELIVERED',
  'FAILED',
  'RETRYING',
]);

/**
 * Query parameters for listing webhooks
 */
export const listWebhooksQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  isActive: z.coerce.boolean().optional(),
  event: webhookEventSchema.optional(),
});

/**
 * Query parameters for listing deliveries
 */
export const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: webhookDeliveryStatusSchema.optional(),
  event: webhookEventSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * Webhook payload schema for validation
 */
export const webhookPayloadSchema = z.object({
  event: webhookEventSchema,
  timestamp: z.string().datetime(),
  data: z.object({
    campaignId: z.string().optional(),
    campaignName: z.string().optional(),
    recipientId: z.string().optional(),
    contactId: z.string().optional(),
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    company: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

// Type exports from schemas
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type ListWebhooksQuery = z.infer<typeof listWebhooksQuerySchema>;
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
