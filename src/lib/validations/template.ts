import { z } from 'zod';

/**
 * Schema for creating a new template
 */
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  subject: z.string().max(998, 'Subject must be 998 characters or less').optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  thumbnail: z.string().url('Thumbnail must be a valid URL').optional().nullable(),
  category: z.string().max(100, 'Category must be 100 characters or less').optional().nullable(),
  isDefault: z.boolean().default(false),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/**
 * Schema for updating an existing template
 */
export const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less').optional(),
  subject: z.string().max(998, 'Subject must be 998 characters or less').optional().nullable(),
  content: z.string().min(1, 'Content is required').optional(),
  thumbnail: z.string().url('Thumbnail must be a valid URL').optional().nullable(),
  category: z.string().max(100, 'Category must be 100 characters or less').optional().nullable(),
  isDefault: z.boolean().optional(),
}).partial();
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

/**
 * Schema for validating template ID parameter
 */
export const templateIdSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
});
export type TemplateIdInput = z.infer<typeof templateIdSchema>;

/**
 * Schema for listing templates with pagination and filtering
 */
export const listTemplatesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must be 100 or less').default(10),
  category: z.string().max(100, 'Category must be 100 characters or less').optional(),
  search: z.string().max(255, 'Search query must be 255 characters or less').optional(),
  isDefault: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'category', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListTemplatesInput = z.infer<typeof listTemplatesSchema>;

/**
 * Schema for duplicating a template
 */
export const duplicateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
});
export type DuplicateTemplateInput = z.infer<typeof duplicateTemplateSchema>;

/**
 * Schema for template preview
 */
export const previewTemplateSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;
