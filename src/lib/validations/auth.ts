import { z } from 'zod';

/**
 * Sign in schema
 */
export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

/**
 * Register schema
 */
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * API Key creation schema
 */
export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  permissions: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
  rateLimit: z.number().int().min(1).max(100000).default(1000),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

/**
 * Update API Key schema
 */
export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
  rateLimit: z.number().int().min(1).max(100000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

/**
 * Admin user update schema
 */
export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

/**
 * List users query schema
 */
export const listUsersQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  isActive: z.enum(['true', 'false']).optional().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/**
 * Available API permissions
 */
export const API_PERMISSIONS = [
  'campaigns:read',
  'campaigns:write',
  'campaigns:delete',
  'campaigns:send',
  'contacts:read',
  'contacts:write',
  'contacts:delete',
  'templates:read',
  'templates:write',
  'templates:delete',
  'analytics:read',
  'settings:read',
  'settings:write',
] as const;

export type ApiPermission = (typeof API_PERMISSIONS)[number];

/**
 * Validate API permissions
 */
export function validatePermissions(permissions: string[]): boolean {
  return permissions.every((p) =>
    API_PERMISSIONS.includes(p as ApiPermission)
  );
}
