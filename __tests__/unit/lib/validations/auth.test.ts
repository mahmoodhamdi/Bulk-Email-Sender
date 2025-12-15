import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  createApiKeySchema,
  updateApiKeySchema,
  adminUpdateUserSchema,
  listUsersQuerySchema,
  API_PERMISSIONS,
  validatePermissions,
} from '@/lib/validations/auth';

describe('Auth Validation Schemas', () => {
  describe('signInSchema', () => {
    it('should accept valid sign in data', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = signInSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const result = signInSchema.safeParse({
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const result = registerSchema.safeParse({
        name: 'J',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'invalid',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Pass1',
        confirmPassword: 'Pass1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'PasswordABC',
        confirmPassword: 'PasswordABC',
      });
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('confirmPassword');
      }
    });

    it('should reject name exceeding max length', () => {
      const result = registerSchema.safeParse({
        name: 'J'.repeat(101),
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept valid profile update', () => {
      const result = updateProfileSchema.safeParse({
        name: 'Jane Doe',
        email: 'jane@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only name', () => {
      const result = updateProfileSchema.safeParse({
        name: 'Jane Doe',
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only email', () => {
      const result = updateProfileSchema.safeParse({
        email: 'jane@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null image', () => {
      const result = updateProfileSchema.safeParse({
        image: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid image URL', () => {
      const result = updateProfileSchema.safeParse({
        image: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid image URL', () => {
      const result = updateProfileSchema.safeParse({
        image: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty object', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty current password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword789',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createApiKeySchema', () => {
    it('should accept valid API key creation', () => {
      const result = createApiKeySchema.safeParse({
        name: 'My API Key',
        permissions: ['campaigns:read', 'contacts:read'],
        rateLimit: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal data with defaults', () => {
      const result = createApiKeySchema.safeParse({
        name: 'My API Key',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.permissions).toEqual([]);
        expect(result.data.rateLimit).toBe(1000);
      }
    });

    it('should reject empty name', () => {
      const result = createApiKeySchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name exceeding max length', () => {
      const result = createApiKeySchema.safeParse({
        name: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid expiration date', () => {
      const result = createApiKeySchema.safeParse({
        name: 'My API Key',
        expiresAt: '2025-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject rate limit below minimum', () => {
      const result = createApiKeySchema.safeParse({
        name: 'My API Key',
        rateLimit: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject rate limit above maximum', () => {
      const result = createApiKeySchema.safeParse({
        name: 'My API Key',
        rateLimit: 100001,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateApiKeySchema', () => {
    it('should accept valid API key update', () => {
      const result = updateApiKeySchema.safeParse({
        name: 'Updated Key Name',
        permissions: ['campaigns:read'],
        rateLimit: 500,
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial update', () => {
      const result = updateApiKeySchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateApiKeySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('adminUpdateUserSchema', () => {
    it('should accept valid admin user update', () => {
      const result = adminUpdateUserSchema.safeParse({
        name: 'Updated Name',
        email: 'updated@example.com',
        role: 'ADMIN',
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid role values', () => {
      const roles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
      roles.forEach((role) => {
        const result = adminUpdateUserSchema.safeParse({ role });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid role', () => {
      const result = adminUpdateUserSchema.safeParse({
        role: 'INVALID_ROLE',
      });
      expect(result.success).toBe(false);
    });

    it('should accept partial update', () => {
      const result = adminUpdateUserSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('listUsersQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const result = listUsersQuerySchema.safeParse({
        page: '2',
        limit: '10',
        search: 'john',
        role: 'USER',
        isActive: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
        expect(result.data.search).toBe('john');
        expect(result.data.role).toBe('USER');
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should provide default values', () => {
      const result = listUsersQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should transform isActive string to boolean', () => {
      const trueResult = listUsersQuerySchema.safeParse({ isActive: 'true' });
      expect(trueResult.success).toBe(true);
      if (trueResult.success) {
        expect(trueResult.data.isActive).toBe(true);
      }

      const falseResult = listUsersQuerySchema.safeParse({ isActive: 'false' });
      expect(falseResult.success).toBe(true);
      if (falseResult.success) {
        expect(falseResult.data.isActive).toBe(false);
      }
    });
  });

  describe('API_PERMISSIONS', () => {
    it('should contain all expected permissions', () => {
      const expectedPermissions = [
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
      ];

      expectedPermissions.forEach((perm) => {
        expect(API_PERMISSIONS).toContain(perm);
      });
    });
  });

  describe('validatePermissions', () => {
    it('should return true for valid permissions', () => {
      expect(validatePermissions(['campaigns:read', 'contacts:read'])).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(validatePermissions([])).toBe(true);
    });

    it('should return false for invalid permissions', () => {
      expect(validatePermissions(['invalid:permission'])).toBe(false);
    });

    it('should return false if any permission is invalid', () => {
      expect(validatePermissions(['campaigns:read', 'invalid:permission'])).toBe(false);
    });

    it('should validate all API_PERMISSIONS', () => {
      expect(validatePermissions([...API_PERMISSIONS])).toBe(true);
    });
  });
});
