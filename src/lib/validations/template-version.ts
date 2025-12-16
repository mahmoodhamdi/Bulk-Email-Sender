import { z } from 'zod';

/**
 * Query parameters for listing versions
 */
export const listVersionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Query parameters for comparing versions
 */
export const compareVersionsQuerySchema = z.object({
  v1: z.coerce.number().min(1),
  v2: z.coerce.number().min(1),
});

/**
 * Parameters for reverting to a version
 */
export const revertVersionSchema = z.object({
  changeSummary: z.string().max(500).optional(),
});

/**
 * Version number parameter
 */
export const versionNumberSchema = z.object({
  version: z.coerce.number().min(1),
});

export type ListVersionsQuery = z.infer<typeof listVersionsQuerySchema>;
export type CompareVersionsQuery = z.infer<typeof compareVersionsQuerySchema>;
export type RevertVersionInput = z.infer<typeof revertVersionSchema>;
