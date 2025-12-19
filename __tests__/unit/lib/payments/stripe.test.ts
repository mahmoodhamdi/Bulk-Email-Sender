/**
 * Stripe Gateway Unit Tests
 * Tests for Stripe payment gateway implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PaymentProvider,
  SubscriptionTier,
  SubscriptionStatus,
  PaymentStatus,
} from '@/lib/payments/types';

// Create mock Stripe client that persists across tests
const mockStripeClient = {
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
  paymentIntents: {
    retrieve: vi.fn(),
  },
  paymentMethods: {
    list: vi.fn(),
    detach: vi.fn(),
  },
  refunds: {
    create: vi.fn(),
  },
  coupons: {
    retrieve: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

// Mock Stripe SDK
vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripeClient),
}));

// Mock Prisma
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  payment: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  paymentWebhookEvent: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock Stripe client module - return the same instance every time
vi.mock('@/lib/payments/stripe/client', () => ({
  getStripeClient: vi.fn(() => mockStripeClient),
  getStripePriceIds: vi.fn(() => ({
    starter: {
      monthly: 'price_starter_monthly',
      yearly: 'price_starter_yearly',
    },
    pro: {
      monthly: 'price_pro_monthly',
      yearly: 'price_pro_yearly',
    },
    enterprise: {
      monthly: 'price_enterprise_monthly',
      yearly: 'price_enterprise_yearly',
    },
  })),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test'),
  isStripeConfigured: vi.fn(() => true),
  clearStripeClient: vi.fn(),
}));

describe('Stripe Gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Provider Information', () => {
    it('should have STRIPE as provider', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');
      const gateway = new StripeGateway();
      expect(gateway.provider).toBe(PaymentProvider.STRIPE);
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with correct parameters', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      // Mock subscription lookup (no existing subscription)
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      // Mock customer creation
      mockStripeClient.customers.create.mockResolvedValue({
        id: 'cus_test123',
        metadata: { userId: 'user123' },
      });

      // Mock subscription upsert
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user123',
        tier: 'FREE',
        status: 'ACTIVE',
        provider: 'STRIPE',
        providerCustomerId: 'cus_test123',
      });

      // Mock checkout session creation
      mockStripeClient.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await gateway.createCheckoutSession({
        userId: 'user123',
        userEmail: 'test@example.com',
        tier: SubscriptionTier.PRO,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result).toHaveProperty('sessionId', 'cs_test123');
      expect(result).toHaveProperty('url', 'https://checkout.stripe.com/test');
      expect(result).toHaveProperty('provider', PaymentProvider.STRIPE);
      expect(result).toHaveProperty('expiresAt');
    });

    it('should include trial days when specified', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue({
        providerCustomerId: 'cus_existing',
        provider: 'STRIPE',
      });

      mockStripeClient.checkout.sessions.create.mockResolvedValue({
        id: 'cs_trial',
        url: 'https://checkout.stripe.com/trial',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      await gateway.createCheckoutSession({
        userId: 'user123',
        userEmail: 'test@example.com',
        tier: SubscriptionTier.STARTER,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialDays: 14,
      });

      expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 14,
          }),
        })
      );
    });
  });

  describe('Customer Portal', () => {
    it('should create customer portal session', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue({
        providerCustomerId: 'cus_test123',
        provider: 'STRIPE',
      });

      mockStripeClient.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      const result = await gateway.createCustomerPortalSession({
        userId: 'user123',
        returnUrl: 'https://example.com/billing',
      });

      expect(result).toHaveProperty('url', 'https://billing.stripe.com/portal');
      expect(result).toHaveProperty('provider', PaymentProvider.STRIPE);
    });

    it('should throw error if no customer found', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(
        gateway.createCustomerPortalSession({
          userId: 'user123',
          returnUrl: 'https://example.com/billing',
        })
      ).rejects.toThrow('No Stripe customer found for this user');
    });
  });

  describe('Subscription Management', () => {
    it('should cancel subscription at period end by default', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockStripeClient.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: true,
      });

      await gateway.cancelSubscription('sub_test123');

      expect(mockStripeClient.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        { cancel_at_period_end: true }
      );
    });

    it('should cancel subscription immediately when specified', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockStripeClient.subscriptions.cancel.mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled',
      });

      await gateway.cancelSubscription('sub_test123', true);

      expect(mockStripeClient.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
    });

    it('should resume subscription by setting cancel_at_period_end to false', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockStripeClient.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: false,
      });

      await gateway.resumeSubscription('sub_test123');

      expect(mockStripeClient.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        { cancel_at_period_end: false }
      );
    });

    it('should update subscription tier', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();
      const now = Math.floor(Date.now() / 1000);

      mockStripeClient.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        items: {
          data: [{ id: 'si_item123' }],
        },
      });

      mockStripeClient.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        customer: 'cus_test123',
        current_period_start: now,
        current_period_end: now + 86400 * 30,
        cancel_at_period_end: false,
        trial_end: null,
        metadata: { tier: 'PRO' },
        items: {
          data: [
            {
              price: {
                id: 'price_pro_monthly',
                metadata: { tier: 'PRO' },
              },
            },
          ],
        },
      });

      // Mock customer retrieval for mapping
      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test123',
        metadata: { userId: 'user123' },
      });

      const result = await gateway.updateSubscription('sub_test123', SubscriptionTier.PRO);

      expect(result).toHaveProperty('tier', SubscriptionTier.PRO);
      expect(result).toHaveProperty('status', SubscriptionStatus.ACTIVE);
      expect(mockStripeClient.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 'si_item123',
              price: 'price_pro_monthly',
            }),
          ]),
        })
      );
    });

    it('should get subscription details', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      const now = Math.floor(Date.now() / 1000);
      mockStripeClient.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        customer: {
          id: 'cus_test123',
          metadata: { userId: 'user123' },
        },
        current_period_start: now - 86400 * 15,
        current_period_end: now + 86400 * 15,
        cancel_at_period_end: false,
        trial_end: null,
        items: {
          data: [
            {
              price: {
                id: 'price_pro_monthly',
                metadata: { tier: 'PRO' },
              },
            },
          ],
        },
      });

      const result = await gateway.getSubscription('sub_test123');

      expect(result).toHaveProperty('id', 'sub_test123');
      expect(result).toHaveProperty('status', SubscriptionStatus.ACTIVE);
      expect(result).toHaveProperty('cancelAtPeriodEnd', false);
    });
  });

  describe('Payment Methods', () => {
    it('should list payment methods for a customer', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockStripeClient.paymentMethods.list.mockResolvedValue({
        data: [
          {
            id: 'pm_test123',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2025,
            },
          },
        ],
      });

      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test123',
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      });

      const methods = await gateway.listPaymentMethods('cus_test123');

      expect(methods).toHaveLength(1);
      expect(methods[0]).toMatchObject({
        id: 'pm_test123',
        cardBrand: 'visa',
        cardLast4: '4242',
        isDefault: true,
      });
    });

    it('should delete payment method', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockStripeClient.paymentMethods.detach.mockResolvedValue({});

      await gateway.deletePaymentMethod('pm_test123');

      expect(mockStripeClient.paymentMethods.detach).toHaveBeenCalledWith('pm_test123');
    });
  });

  describe('Refunds', () => {
    it('should create full refund', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay_db_123',
        providerPaymentId: 'pi_test123',
        amount: 1000,
        refundedAmount: 0,
      });

      mockStripeClient.refunds.create.mockResolvedValue({
        id: 're_test123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
      });

      mockPrisma.payment.update.mockResolvedValue({});

      const result = await gateway.refundPayment({
        paymentId: 'pay_db_123',
      });

      expect(result).toMatchObject({
        id: 're_test123',
        amount: 1000,
        currency: 'usd',
        provider: PaymentProvider.STRIPE,
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_db_123' },
        data: expect.objectContaining({
          refundedAmount: 1000,
          status: PaymentStatus.REFUNDED,
        }),
      });
    });

    it('should create partial refund', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay_db_123',
        providerPaymentId: 'pi_test123',
        amount: 1000,
        refundedAmount: 0,
      });

      mockStripeClient.refunds.create.mockResolvedValue({
        id: 're_test123',
        amount: 500,
        currency: 'usd',
        status: 'succeeded',
      });

      mockPrisma.payment.update.mockResolvedValue({});

      const result = await gateway.refundPayment({
        paymentId: 'pay_db_123',
        amount: 500,
        reason: 'Customer requested partial refund',
      });

      expect(result.amount).toBe(500);

      expect(mockStripeClient.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_test123',
          amount: 500,
        })
      );

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_db_123' },
        data: expect.objectContaining({
          refundedAmount: 500,
          status: PaymentStatus.PARTIALLY_REFUNDED,
        }),
      });
    });
  });

  describe('Customer Management', () => {
    it('should create new customer', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockStripeClient.customers.create.mockResolvedValue({
        id: 'cus_new123',
        metadata: { userId: 'user123' },
      });

      mockPrisma.subscription.upsert.mockResolvedValue({});

      const customerId = await gateway.createCustomer(
        'user123',
        'test@example.com',
        'Test User'
      );

      expect(customerId).toBe('cus_new123');

      expect(mockStripeClient.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { userId: 'user123' },
      });

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123' },
          create: expect.objectContaining({
            userId: 'user123',
            tier: SubscriptionTier.FREE,
            provider: PaymentProvider.STRIPE,
            providerCustomerId: 'cus_new123',
          }),
        })
      );
    });

    it('should delete customer', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      mockStripeClient.customers.del.mockResolvedValue({
        id: 'cus_test123',
        deleted: true,
      });

      await gateway.deleteCustomer('cus_test123');

      expect(mockStripeClient.customers.del).toHaveBeenCalledWith('cus_test123');
    });
  });

  describe('Webhook Event Handling', () => {
    it('should construct and verify webhook event', async () => {
      const { StripeGateway } = await import('@/lib/payments/stripe');

      const gateway = new StripeGateway();

      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: { object: {} },
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);

      const event = await gateway.constructWebhookEvent(
        '{"test": true}',
        'sig_test'
      );

      expect(event).toEqual(mockEvent);
      expect(mockStripeClient.webhooks.constructEvent).toHaveBeenCalledWith(
        '{"test": true}',
        'sig_test',
        'whsec_test'
      );
    });
  });

});
