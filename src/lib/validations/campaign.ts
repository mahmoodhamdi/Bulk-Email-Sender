import { z } from 'zod';

/**
 * Campaign status enum matching Prisma schema
 */
export const CampaignStatusEnum = z.enum([
  'DRAFT',
  'SCHEDULED',
  'SENDING',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);

export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;

/**
 * Schema for creating a new campaign
 */
export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(255, 'Campaign name must be less than 255 characters'),
  subject: z
    .string()
    .min(1, 'Email subject is required')
    .max(998, 'Subject must be less than 998 characters'), // RFC 5322 limit
  fromName: z
    .string()
    .min(1, 'From name is required')
    .max(255, 'From name must be less than 255 characters'),
  fromEmail: z
    .string()
    .email('Invalid from email address'),
  replyTo: z
    .string()
    .email('Invalid reply-to email address')
    .optional()
    .nullable(),
  content: z
    .string()
    .min(1, 'Email content is required'),
  contentType: z
    .enum(['html', 'text'])
    .default('html'),
  templateId: z
    .string()
    .cuid('Invalid template ID')
    .optional()
    .nullable(),
  scheduledAt: z
    .string()
    .datetime('Invalid date format')
    .optional()
    .nullable(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

/**
 * Schema for updating an existing campaign
 */
export const updateCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(255, 'Campaign name must be less than 255 characters')
    .optional(),
  subject: z
    .string()
    .min(1, 'Email subject is required')
    .max(998, 'Subject must be less than 998 characters')
    .optional(),
  fromName: z
    .string()
    .min(1, 'From name is required')
    .max(255, 'From name must be less than 255 characters')
    .optional(),
  fromEmail: z
    .string()
    .email('Invalid from email address')
    .optional(),
  replyTo: z
    .string()
    .email('Invalid reply-to email address')
    .optional()
    .nullable(),
  content: z
    .string()
    .min(1, 'Email content is required')
    .optional(),
  contentType: z
    .enum(['html', 'text'])
    .optional(),
  templateId: z
    .string()
    .cuid('Invalid template ID')
    .optional()
    .nullable(),
  status: CampaignStatusEnum.optional(),
  scheduledAt: z
    .string()
    .datetime('Invalid date format')
    .optional()
    .nullable(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

/**
 * Schema for campaign ID parameter
 */
export const campaignIdSchema = z.object({
  id: z.string().cuid('Invalid campaign ID'),
});

/**
 * Schema for listing campaigns with pagination and filtering
 */
export const listCampaignsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: CampaignStatusEnum.optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['createdAt', 'name', 'status', 'scheduledAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListCampaignsInput = z.infer<typeof listCampaignsSchema>;

/**
 * Schema for adding recipients to a campaign
 */
export const addRecipientsSchema = z.object({
  emails: z
    .array(z.string().email('Invalid email address'))
    .min(1, 'At least one email is required')
    .max(10000, 'Maximum 10000 recipients per request'),
  listIds: z
    .array(z.string().cuid('Invalid list ID'))
    .optional(),
});

export type AddRecipientsInput = z.infer<typeof addRecipientsSchema>;
