import { z } from 'zod';

/**
 * Contact status enum
 */
export const ContactStatusEnum = z.enum(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED']);
export type ContactStatusType = z.infer<typeof ContactStatusEnum>;

/**
 * Schema for creating a new contact
 */
export const createContactSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().max(100, 'First name must be 100 characters or less').optional().nullable(),
  lastName: z.string().max(100, 'Last name must be 100 characters or less').optional().nullable(),
  company: z.string().max(255, 'Company must be 255 characters or less').optional().nullable(),
  customField1: z.string().max(500, 'Custom field 1 must be 500 characters or less').optional().nullable(),
  customField2: z.string().max(500, 'Custom field 2 must be 500 characters or less').optional().nullable(),
  tags: z.array(z.string().max(50, 'Tag must be 50 characters or less')).max(20, 'Maximum 20 tags allowed').default([]),
  status: ContactStatusEnum.default('ACTIVE'),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

/**
 * Schema for updating an existing contact
 */
export const updateContactSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().max(100, 'First name must be 100 characters or less').optional().nullable(),
  lastName: z.string().max(100, 'Last name must be 100 characters or less').optional().nullable(),
  company: z.string().max(255, 'Company must be 255 characters or less').optional().nullable(),
  customField1: z.string().max(500, 'Custom field 1 must be 500 characters or less').optional().nullable(),
  customField2: z.string().max(500, 'Custom field 2 must be 500 characters or less').optional().nullable(),
  tags: z.array(z.string().max(50, 'Tag must be 50 characters or less')).max(20, 'Maximum 20 tags allowed').optional(),
  status: ContactStatusEnum.optional(),
}).partial();
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/**
 * Schema for validating contact ID parameter
 */
export const contactIdSchema = z.object({
  id: z.string().min(1, 'Contact ID is required'),
});
export type ContactIdInput = z.infer<typeof contactIdSchema>;

/**
 * Schema for listing contacts with pagination and filtering
 */
export const listContactsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must be 100 or less').default(10),
  status: ContactStatusEnum.optional(),
  search: z.string().max(255, 'Search query must be 255 characters or less').optional(),
  tag: z.string().max(50, 'Tag filter must be 50 characters or less').optional(),
  sortBy: z.enum(['email', 'firstName', 'lastName', 'company', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListContactsInput = z.infer<typeof listContactsSchema>;

/**
 * Schema for bulk importing contacts
 */
export const bulkImportContactsSchema = z.object({
  contacts: z.array(createContactSchema.omit({ status: true })).min(1, 'At least one contact is required').max(1000, 'Maximum 1000 contacts per import'),
  updateExisting: z.boolean().default(false),
  defaultTags: z.array(z.string().max(50)).max(20).optional(),
});
export type BulkImportContactsInput = z.infer<typeof bulkImportContactsSchema>;

/**
 * Schema for bulk operations on contacts
 */
export const bulkOperationSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1, 'At least one contact ID is required').max(100, 'Maximum 100 contacts per operation'),
  operation: z.enum(['delete', 'addTag', 'removeTag', 'updateStatus']),
  tag: z.string().max(50).optional(),
  status: ContactStatusEnum.optional(),
});
export type BulkOperationInput = z.infer<typeof bulkOperationSchema>;

/**
 * Schema for adding contacts to a list
 */
export const addToListSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  contactIds: z.array(z.string().min(1)).min(1, 'At least one contact ID is required').max(100, 'Maximum 100 contacts per operation'),
});
export type AddToListInput = z.infer<typeof addToListSchema>;
