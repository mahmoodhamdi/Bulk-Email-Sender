/**
 * Subscription Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscriptionContext,
  withSubscription,
  withEmailLimit,
  withContactLimit,
  requireFeature,
  requireTier,
  addSubscriptionHeaders,
} from '@/lib/subscription/middleware';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/payments/types';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  subscription: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function createMockRequest(method = 'GET', body?: object): NextRequest {
  const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
    method,
    ...(body && { body: JSON.stringify(body) }),
  });
  return request;
}

describe('Subscription Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscriptionContext', () => {
    it('should return FREE tier context for user without subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const context = await getSubscriptionContext('user-123');

      expect(context).not.toBeNull();
      expect(context!.tier).toBe(SubscriptionTier.FREE);
      expect(context!.status).toBe(SubscriptionStatus.ACTIVE);
      expect(context!.emailsRemaining).toBe(100);
      expect(context!.contactsRemaining).toBe(500);
      // FREE tier has 5 templates (so templates is true) but no abTesting
      expect(context!.features.templates).toBe(true);
      expect(context!.features.abTesting).toBe(false);
    });

    it('should return correct context for subscribed user', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 10000,
        contactsCount: 5000,
      });

      const context = await getSubscriptionContext('user-123');

      expect(context!.tier).toBe(SubscriptionTier.PRO);
      expect(context!.emailsRemaining).toBe(40000);
      expect(context!.contactsRemaining).toBe(45000);
      expect(context!.features.abTesting).toBe(true);
      expect(context!.features.automation).toBe(true);
    });

    it('should handle custom limits', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: 10000,
        contactLimit: 10000,
        emailsSentThisMonth: 2000,
        contactsCount: 1000,
      });

      const context = await getSubscriptionContext('user-123');

      expect(context!.emailsRemaining).toBe(8000);
      expect(context!.contactsRemaining).toBe(9000);
    });
  });

  describe('withSubscription', () => {
    it('should return 401 for unauthenticated user', async () => {
      mockAuth.mockResolvedValue(null);

      const handler = vi.fn();
      const wrappedHandler = withSubscription(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should call handler with subscription context', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = withSubscription(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          userId: 'user-123',
          tier: SubscriptionTier.PRO,
        })
      );
    });

    it('should return 403 for inactive subscription', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.PAST_DUE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn();
      const wrappedHandler = withSubscription(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Subscription inactive');
    });

    it('should allow inactive subscription when requireActive is false', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.PAST_DUE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = withSubscription(handler, { requireActive: false });

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should return 403 when required tier not met', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn();
      const wrappedHandler = withSubscription(handler, {
        requiredTier: SubscriptionTier.PRO,
      });

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Upgrade required');
      expect(data.requiredTier).toBe(SubscriptionTier.PRO);
    });

    it('should allow when required tier is met', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = withSubscription(handler, {
        requiredTier: SubscriptionTier.STARTER,
      });

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it('should return 403 when required feature not available', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 10,
        contactsCount: 50,
      });

      const handler = vi.fn();
      const wrappedHandler = withSubscription(handler, {
        requiredFeature: 'abTesting',
      });

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Feature not available');
      expect(data.feature).toBe('abTesting');
    });
  });

  describe('withEmailLimit', () => {
    it('should allow request when under email limit', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = withEmailLimit(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should return 429 when email limit exceeded', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 100, // At limit
        contactsCount: 50,
      });

      const handler = vi.fn();
      const wrappedHandler = withEmailLimit(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('Email limit exceeded');
    });

    it('should use custom email count function', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 4900,
        contactsCount: 500,
      });

      const handler = vi.fn();
      const getEmailCount = vi.fn().mockResolvedValue(200); // Would exceed
      const wrappedHandler = withEmailLimit(handler, getEmailCount);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.remaining).toBe(100);
      expect(data.requested).toBe(200);
    });
  });

  describe('withContactLimit', () => {
    it('should allow request when under contact limit', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 1000,
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = withContactLimit(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it('should return 429 when contact limit exceeded', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 50,
        contactsCount: 500, // At limit
      });

      const handler = vi.fn();
      const wrappedHandler = withContactLimit(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('Contact limit exceeded');
    });
  });

  describe('requireFeature', () => {
    it('should create middleware that requires a feature', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = requireFeature('automation')(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it('should deny when feature not available', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 10,
        contactsCount: 50,
      });

      const handler = vi.fn();
      const wrappedHandler = requireFeature('automation')(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(403);
    });
  });

  describe('requireTier', () => {
    it('should create middleware that requires a tier', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = requireTier(SubscriptionTier.PRO)(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it('should deny when tier not met', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 1000,
        contactsCount: 500,
      });

      const handler = vi.fn();
      const wrappedHandler = requireTier(SubscriptionTier.ENTERPRISE)(handler);

      const request = createMockRequest();
      const response = await wrappedHandler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.requiredTier).toBe(SubscriptionTier.ENTERPRISE);
    });
  });

  describe('addSubscriptionHeaders', () => {
    it('should add subscription info to headers', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 10000,
        contactsCount: 5000,
      });

      const request = createMockRequest();
      const headers = await addSubscriptionHeaders(request, 'user-123');

      expect(headers.get('x-subscription-tier')).toBe(SubscriptionTier.PRO);
      expect(headers.get('x-subscription-status')).toBe(SubscriptionStatus.ACTIVE);
      expect(headers.get('x-emails-remaining')).toBe('40000');
      expect(headers.get('x-contacts-remaining')).toBe('45000');
      expect(headers.get('x-features')).toBeTruthy();
    });

    it('should handle unlimited limits', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: null,
        contactLimit: null,
        emailsSentThisMonth: 10000,
        contactsCount: 5000,
      });

      const request = createMockRequest();
      const headers = await addSubscriptionHeaders(request, 'user-123');

      expect(headers.get('x-emails-remaining')).toBe('unlimited');
      expect(headers.get('x-contacts-remaining')).toBe('unlimited');
    });
  });
});
