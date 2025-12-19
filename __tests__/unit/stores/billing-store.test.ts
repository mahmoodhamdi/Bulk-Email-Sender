/**
 * Billing Store Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useBillingStore,
  selectSubscription,
  selectTier,
  selectStatus,
  selectUsage,
  canAccessFeature,
  isPaidPlan,
  formatPrice,
  BillingState,
} from '@/stores/billing-store';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/payments/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock document.querySelector for CSRF token
Object.defineProperty(document, 'querySelector', {
  value: vi.fn().mockReturnValue({
    getAttribute: () => 'mock-csrf-token',
  }),
});

// Mock window.location
const originalLocation = window.location;

describe('Billing Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useBillingStore.setState({
      subscription: null,
      isLoading: false,
      error: null,
      paymentHistory: [],
      isLoadingHistory: false,
      checkoutUrl: null,
      isCheckingOut: false,
      checkoutError: null,
      portalUrl: null,
      isOpeningPortal: false,
      availableProviders: [],
    });

    // Mock window.location
    delete (window as { location?: Location }).location;
    window.location = { origin: 'http://localhost:3000' } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('fetchSubscription', () => {
    it('should fetch and set subscription data', async () => {
      const mockSubscription = {
        id: 'sub-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        usage: {
          emailsSentThisMonth: 1000,
          emailLimit: 50000,
          emailsRemaining: 49000,
          emailsPercentage: 2,
          contactsCount: 500,
          contactLimit: 50000,
          contactsRemaining: 49500,
          contactsPercentage: 1,
          usageResetAt: '2024-02-01T00:00:00.000Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSubscription }),
      });

      await useBillingStore.getState().fetchSubscription();

      const state = useBillingStore.getState();
      expect(state.subscription).toEqual(mockSubscription);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await useBillingStore.getState().fetchSubscription();

      const state = useBillingStore.getState();
      expect(state.subscription).toBeNull();
      expect(state.error).toBe('Failed to fetch subscription');
    });
  });

  describe('fetchPaymentHistory', () => {
    it('should fetch and set payment history', async () => {
      const mockHistory = [
        {
          id: 'pay-1',
          amount: 1499,
          currency: 'USD',
          status: 'succeeded',
          description: 'Pro Plan',
          createdAt: '2024-01-15T00:00:00.000Z',
          receiptUrl: 'https://receipt.url',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockHistory }),
      });

      await useBillingStore.getState().fetchPaymentHistory();

      const state = useBillingStore.getState();
      expect(state.paymentHistory).toEqual(mockHistory);
      expect(state.isLoadingHistory).toBe(false);
    });

    it('should handle fetch failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await useBillingStore.getState().fetchPaymentHistory();

      const state = useBillingStore.getState();
      expect(state.paymentHistory).toEqual([]);
      expect(state.isLoadingHistory).toBe(false);
    });
  });

  describe('createCheckout', () => {
    it('should create checkout session and return URL', async () => {
      const checkoutUrl = 'https://checkout.stripe.com/session-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { url: checkoutUrl } }),
      });

      const returnedUrl = await useBillingStore.getState().createCheckout(SubscriptionTier.PRO);

      const state = useBillingStore.getState();
      expect(returnedUrl).toBe(checkoutUrl);
      expect(state.checkoutUrl).toBe(checkoutUrl);
      expect(state.isCheckingOut).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'mock-csrf-token',
        },
        body: expect.stringContaining('"tier":"PRO"'),
      });
    });

    it('should handle checkout with provider and interval', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { url: 'https://checkout.url' } }),
      });

      await useBillingStore.getState().createCheckout(SubscriptionTier.PRO, 'stripe', 'yearly');

      expect(mockFetch).toHaveBeenCalledWith('/api/payments/checkout', {
        method: 'POST',
        headers: expect.any(Object),
        body: expect.stringContaining('"billingInterval":"yearly"'),
      });
    });

    it('should set error on checkout failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment failed' }),
      });

      const returnedUrl = await useBillingStore.getState().createCheckout(SubscriptionTier.PRO);

      const state = useBillingStore.getState();
      expect(returnedUrl).toBeNull();
      expect(state.checkoutError).toBe('Payment failed');
    });
  });

  describe('openCustomerPortal', () => {
    it('should open customer portal and return URL', async () => {
      const portalUrl = 'https://billing.stripe.com/portal-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { url: portalUrl } }),
      });

      const returnedUrl = await useBillingStore.getState().openCustomerPortal();

      const state = useBillingStore.getState();
      expect(returnedUrl).toBe(portalUrl);
      expect(state.portalUrl).toBe(portalUrl);
    });

    it('should use custom return URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { url: 'https://portal.url' } }),
      });

      await useBillingStore.getState().openCustomerPortal('/settings');

      expect(mockFetch).toHaveBeenCalledWith('/api/payments/portal', {
        method: 'POST',
        headers: expect.any(Object),
        body: expect.stringContaining('"/settings"'),
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription and refresh', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { status: SubscriptionStatus.CANCELED } }),
        });

      const success = await useBillingStore.getState().cancelSubscription();

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should cancel immediately when flag is set', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: null }),
        });

      await useBillingStore.getState().cancelSubscription(true);

      expect(mockFetch).toHaveBeenCalledWith('/api/payments/subscription', {
        method: 'DELETE',
        headers: expect.any(Object),
        body: expect.stringContaining('"immediately":true'),
      });
    });

    it('should set error on cancel failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const success = await useBillingStore.getState().cancelSubscription();

      const state = useBillingStore.getState();
      expect(success).toBe(false);
      expect(state.error).toBe('Failed to cancel subscription');
    });
  });

  describe('resumeSubscription', () => {
    it('should resume subscription and refresh', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { status: SubscriptionStatus.ACTIVE } }),
        });

      const success = await useBillingStore.getState().resumeSubscription();

      expect(success).toBe(true);
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription tier', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { tier: SubscriptionTier.ENTERPRISE } }),
        });

      const success = await useBillingStore.getState().updateSubscription(SubscriptionTier.ENTERPRISE);

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/subscription', {
        method: 'PATCH',
        headers: expect.any(Object),
        body: expect.stringContaining('"tier":"ENTERPRISE"'),
      });
    });
  });

  describe('clearError', () => {
    it('should clear both error and checkoutError', () => {
      // Set some errors first
      useBillingStore.setState({
        error: 'Some error',
        checkoutError: 'Checkout failed',
      });

      useBillingStore.getState().clearError();

      const state = useBillingStore.getState();
      expect(state.error).toBeNull();
      expect(state.checkoutError).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set some state first
      useBillingStore.setState({
        subscription: { tier: SubscriptionTier.PRO } as any,
        paymentHistory: [{ id: 'pay-1' }] as any,
        checkoutUrl: 'https://checkout.url',
        portalUrl: 'https://portal.url',
      });

      useBillingStore.getState().reset();

      const state = useBillingStore.getState();
      expect(state.subscription).toBeNull();
      expect(state.paymentHistory).toEqual([]);
      expect(state.checkoutUrl).toBeNull();
      expect(state.portalUrl).toBeNull();
    });
  });

  describe('selectors', () => {
    it('selectSubscription should return subscription', () => {
      const state = {
        subscription: { tier: SubscriptionTier.PRO },
      } as BillingState;

      expect(selectSubscription(state)).toEqual({ tier: SubscriptionTier.PRO });
    });

    it('selectTier should return tier or FREE as default', () => {
      const stateWithSub = {
        subscription: { tier: SubscriptionTier.PRO },
      } as BillingState;

      const stateWithoutSub = {
        subscription: null,
      } as BillingState;

      expect(selectTier(stateWithSub)).toBe(SubscriptionTier.PRO);
      expect(selectTier(stateWithoutSub)).toBe(SubscriptionTier.FREE);
    });

    it('selectStatus should return status or ACTIVE as default', () => {
      const stateWithSub = {
        subscription: { status: SubscriptionStatus.PAST_DUE },
      } as BillingState;

      const stateWithoutSub = {
        subscription: null,
      } as BillingState;

      expect(selectStatus(stateWithSub)).toBe(SubscriptionStatus.PAST_DUE);
      expect(selectStatus(stateWithoutSub)).toBe(SubscriptionStatus.ACTIVE);
    });

    it('selectUsage should return usage', () => {
      const usage = { emailsSentThisMonth: 1000 };
      const state = {
        subscription: { usage },
      } as BillingState;

      expect(selectUsage(state)).toEqual(usage);
    });
  });

  describe('helper functions', () => {
    describe('canAccessFeature', () => {
      it('should check feature access based on tier', () => {
        const proState = {
          subscription: { tier: SubscriptionTier.PRO },
        } as BillingState;

        const freeState = {
          subscription: { tier: SubscriptionTier.FREE },
        } as BillingState;

        expect(canAccessFeature(proState, 'abTesting')).toBe(true);
        expect(canAccessFeature(freeState, 'abTesting')).toBe(false);
      });

      it('should default to FREE tier when no subscription', () => {
        const state = {
          subscription: null,
        } as BillingState;

        // FREE tier doesn't have abTesting
        expect(canAccessFeature(state, 'abTesting')).toBe(false);
      });
    });

    describe('isPaidPlan', () => {
      it('should return true for paid tiers', () => {
        const paidState = {
          subscription: { tier: SubscriptionTier.STARTER },
        } as BillingState;

        expect(isPaidPlan(paidState)).toBe(true);
      });

      it('should return false for FREE tier', () => {
        const freeState = {
          subscription: { tier: SubscriptionTier.FREE },
        } as BillingState;

        expect(isPaidPlan(freeState)).toBe(false);
      });

      it('should return false when no subscription', () => {
        const noSubState = {
          subscription: null,
        } as BillingState;

        expect(isPaidPlan(noSubState)).toBe(false);
      });
    });

    describe('formatPrice', () => {
      it('should format price in cents to currency', () => {
        expect(formatPrice(1499)).toBe('$14.99');
        expect(formatPrice(499)).toBe('$4.99');
        expect(formatPrice(4999)).toBe('$49.99');
      });

      it('should handle different currencies', () => {
        expect(formatPrice(1000, 'EUR')).toBe('€10.00');
        expect(formatPrice(1000, 'GBP')).toBe('£10.00');
      });
    });
  });
});
