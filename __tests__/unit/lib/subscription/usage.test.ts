/**
 * Usage Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserUsage,
  checkEmailLimit,
  checkContactLimit,
  checkFeatureAccess,
  incrementEmailCount,
  incrementContactCount,
  decrementContactCount,
  resetMonthlyUsage,
  syncContactCount,
  getUserTier,
  isPaidUser,
  getUserLimits,
} from '@/lib/subscription/usage';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/payments/types';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

const mockPrisma = prisma as unknown as {
  subscription: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  contact: {
    count: ReturnType<typeof vi.fn>;
  };
};

describe('Usage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserUsage', () => {
    it('should return FREE tier usage for user without subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const usage = await getUserUsage('user-123');

      expect(usage.tier).toBe(SubscriptionTier.FREE);
      expect(usage.status).toBe(SubscriptionStatus.ACTIVE);
      expect(usage.emailLimit).toBe(100);
      expect(usage.contactLimit).toBe(500);
      expect(usage.emailsSentThisMonth).toBe(0);
      expect(usage.canSendEmails).toBe(true);
      expect(usage.canAddContacts).toBe(true);
    });

    it('should return correct usage for subscribed user', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 25000,
        emailLimit: null, // Use tier default
        contactsCount: 10000,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const usage = await getUserUsage('user-123');

      expect(usage.tier).toBe(SubscriptionTier.PRO);
      expect(usage.emailsSentThisMonth).toBe(25000);
      expect(usage.emailLimit).toBe(50000);
      expect(usage.emailsRemaining).toBe(25000);
      expect(usage.emailUsagePercent).toBe(50);
      expect(usage.canSendEmails).toBe(true);
    });

    it('should handle user at email limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 5000,
        emailLimit: null,
        contactsCount: 1000,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const usage = await getUserUsage('user-123');

      expect(usage.emailsRemaining).toBe(0);
      expect(usage.emailUsagePercent).toBe(100);
      expect(usage.isOverLimit).toBe(true);
      expect(usage.canSendEmails).toBe(false);
    });

    it('should handle custom limits', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 5000,
        emailLimit: 10000, // Custom higher limit
        contactsCount: 1000,
        contactLimit: 10000, // Custom higher limit
        usageResetAt: new Date(),
      });

      const usage = await getUserUsage('user-123');

      expect(usage.emailLimit).toBe(10000);
      expect(usage.emailsRemaining).toBe(5000);
      expect(usage.contactLimit).toBe(10000);
      expect(usage.contactsRemaining).toBe(9000);
    });

    it('should handle inactive subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.PAST_DUE,
        emailsSentThisMonth: 1000,
        emailLimit: null,
        contactsCount: 500,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const usage = await getUserUsage('user-123');

      expect(usage.canSendEmails).toBe(false);
      expect(usage.canAddContacts).toBe(false);
    });
  });

  describe('checkEmailLimit', () => {
    it('should allow sending when under limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 1000,
        emailLimit: null,
        contactsCount: 500,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const result = await checkEmailLimit('user-123', 100);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4000);
    });

    it('should deny sending when over limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 4900,
        emailLimit: null,
        contactsCount: 500,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const result = await checkEmailLimit('user-123', 200);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Email limit exceeded');
      expect(result.remaining).toBe(100);
    });

    it('should allow unlimited for ENTERPRISE tier', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 1000000,
        emailLimit: null,
        contactsCount: 500000,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const result = await checkEmailLimit('user-123', 100000);

      expect(result.allowed).toBe(true);
    });

    it('should deny for inactive subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        emailsSentThisMonth: 100,
        emailLimit: null,
        contactsCount: 500,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const result = await checkEmailLimit('user-123', 10);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not active');
    });
  });

  describe('checkContactLimit', () => {
    it('should allow adding contacts when under limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 0,
        emailLimit: null,
        contactsCount: 1000,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const result = await checkContactLimit('user-123', 100);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4000);
    });

    it('should deny adding contacts when over limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        emailsSentThisMonth: 0,
        emailLimit: null,
        contactsCount: 450,
        contactLimit: null,
        usageResetAt: new Date(),
      });

      const result = await checkContactLimit('user-123', 100);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Contact limit exceeded');
    });
  });

  describe('checkFeatureAccess', () => {
    it('should allow feature access for tier with feature', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await checkFeatureAccess('user-123', 'abTesting');

      expect(result.allowed).toBe(true);
    });

    it('should deny feature access for tier without feature', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await checkFeatureAccess('user-123', 'abTesting');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not available');
    });

    it('should deny for inactive subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
      });

      const result = await checkFeatureAccess('user-123', 'abTesting');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not active');
    });
  });

  describe('incrementEmailCount', () => {
    it('should increment email count', async () => {
      mockPrisma.subscription.update.mockResolvedValue({});

      await incrementEmailCount('user-123', 50);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          emailsSentThisMonth: {
            increment: 50,
          },
        },
      });
    });

    it('should default to incrementing by 1', async () => {
      mockPrisma.subscription.update.mockResolvedValue({});

      await incrementEmailCount('user-123');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          emailsSentThisMonth: {
            increment: 1,
          },
        },
      });
    });
  });

  describe('incrementContactCount', () => {
    it('should increment contact count', async () => {
      mockPrisma.subscription.update.mockResolvedValue({});

      await incrementContactCount('user-123', 10);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          contactsCount: {
            increment: 10,
          },
        },
      });
    });
  });

  describe('decrementContactCount', () => {
    it('should decrement contact count', async () => {
      mockPrisma.subscription.update.mockResolvedValue({});

      await decrementContactCount('user-123', 5);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          contactsCount: {
            decrement: 5,
          },
        },
      });
    });
  });

  describe('resetMonthlyUsage', () => {
    it('should reset email count and set new reset date', async () => {
      mockPrisma.subscription.update.mockResolvedValue({});

      await resetMonthlyUsage('user-123');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          emailsSentThisMonth: 0,
          usageResetAt: expect.any(Date),
        },
      });
    });
  });

  describe('syncContactCount', () => {
    it('should sync contact count from database', async () => {
      mockPrisma.contact.count.mockResolvedValue(1500);
      mockPrisma.subscription.update.mockResolvedValue({});

      await syncContactCount('user-123');

      expect(mockPrisma.contact.count).toHaveBeenCalledWith({
        where: {
          listMembers: {
            some: {
              list: {
                userId: 'user-123',
              },
            },
          },
        },
      });

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { contactsCount: 1500 },
      });
    });
  });

  describe('getUserTier', () => {
    it('should return user tier', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
      });

      const tier = await getUserTier('user-123');

      expect(tier).toBe(SubscriptionTier.PRO);
    });

    it('should return FREE for user without subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const tier = await getUserTier('user-123');

      expect(tier).toBe(SubscriptionTier.FREE);
    });
  });

  describe('isPaidUser', () => {
    it('should return true for paid tier', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
      });

      const isPaid = await isPaidUser('user-123');

      expect(isPaid).toBe(true);
    });

    it('should return false for FREE tier', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.FREE,
      });

      const isPaid = await isPaidUser('user-123');

      expect(isPaid).toBe(false);
    });
  });

  describe('getUserLimits', () => {
    it('should return tier limits', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        emailLimit: null,
        contactLimit: null,
      });

      const limits = await getUserLimits('user-123');

      expect(limits.emailsPerMonth).toBe(50000);
      expect(limits.contacts).toBe(50000);
      expect(limits.abTesting).toBe(true);
      expect(limits.automation).toBe(true);
      expect(limits.apiAccess).toBe(true);
      expect(limits.webhooks).toBe(true);
      expect(limits.customBranding).toBe(true);
      expect(limits.prioritySupport).toBe(true);
    });

    it('should use custom limits when set', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        emailLimit: 10000,
        contactLimit: 10000,
      });

      const limits = await getUserLimits('user-123');

      expect(limits.emailsPerMonth).toBe(10000);
      expect(limits.contacts).toBe(10000);
    });

    it('should return FREE limits for user without subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const limits = await getUserLimits('user-123');

      expect(limits.emailsPerMonth).toBe(100);
      expect(limits.contacts).toBe(500);
      // FREE tier has 5 templates so templates=true
      expect(limits.templates).toBe(true);
      expect(limits.abTesting).toBe(false);
      expect(limits.automation).toBe(false);
    });
  });
});
