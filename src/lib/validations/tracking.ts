import { z } from 'zod';

/**
 * Event type enum
 */
export const EventTypeEnum = z.enum(['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'UNSUBSCRIBED', 'COMPLAINED']);
export type EventTypeType = z.infer<typeof EventTypeEnum>;

/**
 * Schema for tracking pixel request (email open)
 */
export const trackOpenSchema = z.object({
  trackingId: z.string().min(1, 'Tracking ID is required'),
});
export type TrackOpenInput = z.infer<typeof trackOpenSchema>;

/**
 * Schema for link click tracking
 */
export const trackClickSchema = z.object({
  trackingId: z.string().min(1, 'Tracking ID is required'),
  url: z.string().url('Invalid redirect URL'),
  linkId: z.string().optional(),
});
export type TrackClickInput = z.infer<typeof trackClickSchema>;

/**
 * Schema for unsubscribe request
 */
export const unsubscribeSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
});
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;

/**
 * Schema for webhook event (from email provider)
 */
export const webhookEventSchema = z.object({
  type: EventTypeEnum,
  email: z.string().email('Invalid email address'),
  campaignId: z.string().optional(),
  recipientId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;

/**
 * Schema for listing events with pagination and filtering
 */
export const listEventsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must be 100 or less').default(10),
  campaignId: z.string().optional(),
  recipientId: z.string().optional(),
  type: EventTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListEventsInput = z.infer<typeof listEventsSchema>;

/**
 * Schema for campaign analytics request
 */
export const campaignAnalyticsSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});
export type CampaignAnalyticsInput = z.infer<typeof campaignAnalyticsSchema>;

/**
 * Schema for recipient stats
 */
export const recipientStatsSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must be 100 or less').default(50),
  status: z.enum(['PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED']).optional(),
});
export type RecipientStatsInput = z.infer<typeof recipientStatsSchema>;

/**
 * Schema for bounce event
 */
export const bounceEventSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['hard', 'soft']),
  reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
  campaignId: z.string().optional(),
  recipientId: z.string().optional(),
});
export type BounceEventInput = z.infer<typeof bounceEventSchema>;

/**
 * Schema for complaint event
 */
export const complaintEventSchema = z.object({
  email: z.string().email('Invalid email address'),
  campaignId: z.string().optional(),
  recipientId: z.string().optional(),
  feedbackType: z.string().max(100).optional(),
});
export type ComplaintEventInput = z.infer<typeof complaintEventSchema>;
