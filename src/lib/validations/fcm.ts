import { z } from 'zod';

/**
 * Schema for registering FCM token
 */
export const registerFcmTokenSchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
  deviceInfo: z.object({
    platform: z.enum(['web', 'android', 'ios']).optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
  }).optional(),
});

export type RegisterFcmTokenInput = z.infer<typeof registerFcmTokenSchema>;

/**
 * Schema for sending push notification
 */
export const sendNotificationSchema = z.object({
  // Target - one of these must be provided
  token: z.string().optional(),
  tokens: z.array(z.string()).optional(),
  userId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  topic: z.string().optional(),

  // Notification content
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(1000),
  imageUrl: z.string().url().optional(),

  // Custom data
  data: z.record(z.string()).optional(),

  // Options
  priority: z.enum(['high', 'normal']).optional(),
}).refine(
  (data) => data.token || data.tokens || data.userId || data.userIds || data.topic,
  {
    message: 'At least one target (token, tokens, userId, userIds, or topic) must be provided',
  }
);

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

/**
 * Schema for topic subscription
 */
export const topicSubscriptionSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(100).regex(
    /^[a-zA-Z0-9-_.~%]+$/,
    'Topic can only contain alphanumeric characters, hyphens, underscores, periods, and tildes'
  ),
  tokens: z.array(z.string()).min(1, 'At least one token is required').optional(),
});

export type TopicSubscriptionInput = z.infer<typeof topicSubscriptionSchema>;

/**
 * Schema for campaign notification
 */
export const campaignNotificationSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(1000),
  imageUrl: z.string().url().optional(),
  link: z.string().url().optional(),
});

export type CampaignNotificationInput = z.infer<typeof campaignNotificationSchema>;

/**
 * Notification types for categorization
 */
export const NOTIFICATION_TYPES = [
  'campaign_sent',
  'campaign_completed',
  'campaign_failed',
  'new_subscriber',
  'unsubscribe',
  'bounce',
  'complaint',
  'system',
  'custom',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
