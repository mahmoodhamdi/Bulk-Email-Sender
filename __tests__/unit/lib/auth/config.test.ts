import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword, hasRole, isAdmin, isSuperAdmin } from '@/lib/auth/config';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockImplementation((password: string, rounds: number) =>
      Promise.resolve(`hashed_${password}_${rounds}`)
    ),
    compare: vi.fn().mockImplementation((password: string, hash: string) =>
      Promise.resolve(hash === `hashed_${password}_12`)
    ),
  },
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Auth Config Utilities', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'mySecretPassword';
      const hash = await hashPassword(password);
      expect(hash).toBe('hashed_mySecretPassword_12');
    });

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const correctPassword = 'correctPassword';
      const hash = await hashPassword(correctPassword);
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has required role', () => {
      const session = { user: { role: 'ADMIN' } };
      expect(hasRole(session, ['ADMIN'])).toBe(true);
    });

    it('should return true when user has one of required roles', () => {
      const session = { user: { role: 'USER' } };
      expect(hasRole(session, ['USER', 'ADMIN'])).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      const session = { user: { role: 'USER' } };
      expect(hasRole(session, ['ADMIN', 'SUPER_ADMIN'])).toBe(false);
    });

    it('should return false for null session', () => {
      expect(hasRole(null, ['ADMIN'])).toBe(false);
    });

    it('should return false for undefined session', () => {
      expect(hasRole(undefined, ['ADMIN'])).toBe(false);
    });

    it('should return false for session without user', () => {
      const session = {};
      expect(hasRole(session, ['ADMIN'])).toBe(false);
    });

    it('should return false for user without role', () => {
      const session = { user: {} };
      expect(hasRole(session, ['ADMIN'])).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN role', () => {
      const session = { user: { role: 'ADMIN' } };
      expect(isAdmin(session)).toBe(true);
    });

    it('should return true for SUPER_ADMIN role', () => {
      const session = { user: { role: 'SUPER_ADMIN' } };
      expect(isAdmin(session)).toBe(true);
    });

    it('should return false for USER role', () => {
      const session = { user: { role: 'USER' } };
      expect(isAdmin(session)).toBe(false);
    });

    it('should return false for null session', () => {
      expect(isAdmin(null)).toBe(false);
    });

    it('should return false for undefined session', () => {
      expect(isAdmin(undefined)).toBe(false);
    });

    it('should return false for session without user', () => {
      expect(isAdmin({})).toBe(false);
    });

    it('should return false for user without role', () => {
      expect(isAdmin({ user: {} })).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true for SUPER_ADMIN role', () => {
      const session = { user: { role: 'SUPER_ADMIN' } };
      expect(isSuperAdmin(session)).toBe(true);
    });

    it('should return false for ADMIN role', () => {
      const session = { user: { role: 'ADMIN' } };
      expect(isSuperAdmin(session)).toBe(false);
    });

    it('should return false for USER role', () => {
      const session = { user: { role: 'USER' } };
      expect(isSuperAdmin(session)).toBe(false);
    });

    it('should return false for null session', () => {
      expect(isSuperAdmin(null)).toBe(false);
    });

    it('should return false for undefined session', () => {
      expect(isSuperAdmin(undefined)).toBe(false);
    });

    it('should return false for session without user', () => {
      expect(isSuperAdmin({})).toBe(false);
    });

    it('should return false for user without role', () => {
      expect(isSuperAdmin({ user: {} })).toBe(false);
    });
  });
});
