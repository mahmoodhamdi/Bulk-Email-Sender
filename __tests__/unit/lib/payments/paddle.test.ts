/**
 * Paddle Gateway Unit Tests
 * Tests for Paddle payment gateway implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PaymentProvider,
  SubscriptionTier,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethodType,
} from '@/lib/payments/types';

// Mock Prisma
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  payment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  paymentMethod: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  paymentWebhookEvent: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock Paddle client functions
vi.mock('@/lib/payments/paddle/client', async () => {
  const actual = await vi.importActual('@/lib/payments/paddle/client');
  return {
    ...actual,
    getPaddleApiKey: vi.fn(() => 'test_api_key'),
    getPaddleWebhookSecret: vi.fn(() => 'test_webhook_secret'),
    getPaddleClientToken: vi.fn(() => 'test_client_token'),
    getPaddleEnvironment: vi.fn(() => 'sandbox'),
    isPaddleConfigured: vi.fn(() => true),
    getPaddlePriceIds: vi.fn(() => ({
      starter: { monthly: 'pri_starter_monthly', yearly: 'pri_starter_yearly' },
      pro: { monthly: 'pri_pro_monthly', yearly: 'pri_pro_yearly' },
      enterprise: { monthly: 'pri_enterprise_monthly', yearly: 'pri_enterprise_yearly' },
    })),
    createCustomer: vi.fn(() => Promise.resolve({
      id: 'ctm_test123',
      email: 'test@example.com',
      name: 'Test User',
    })),
    getCustomer: vi.fn(() => Promise.resolve({
      id: 'ctm_test123',
      email: 'test@example.com',
      name: 'Test User',
    })),
    listCustomers: vi.fn(() => Promise.resolve([])),
    getSubscription: vi.fn(() => Promise.resolve({
      id: 'sub_test123',
      status: 'active',
      customer_id: 'ctm_test123',
      current_billing_period: {
        starts_at: '2024-01-01T00:00:00Z',
        ends_at: '2024-02-01T00:00:00Z',
      },
      scheduled_change: null,
      items: [
        {
          price: {
            custom_data: { tier: 'PRO' },
          },
          trial_dates: null,
        },
      ],
      custom_data: { user_id: 'user123' },
      management_urls: {
        update_payment_method: 'https://paddle.com/update',
        cancel: 'https://paddle.com/cancel',
      },
    })),
    listSubscriptions: vi.fn(() => Promise.resolve([])),
    updateSubscription: vi.fn(() => Promise.resolve({
      id: 'sub_test123',
      status: 'active',
      customer_id: 'ctm_test123',
      current_billing_period: {
        starts_at: '2024-01-01T00:00:00Z',
        ends_at: '2024-02-01T00:00:00Z',
      },
      scheduled_change: null,
      items: [{ price: { custom_data: { tier: 'PRO' } } }],
      custom_data: { user_id: 'user123' },
    })),
    cancelSubscription: vi.fn(() => Promise.resolve({
      id: 'sub_test123',
      status: 'canceled',
    })),
    resumeSubscription: vi.fn(() => Promise.resolve({
      id: 'sub_test123',
      status: 'active',
    })),
    getTransaction: vi.fn(() => Promise.resolve({
      id: 'txn_test123',
      status: 'completed',
      custom_data: { user_id: 'user123' },
      details: {
        totals: { total: '1499', currency_code: 'USD' },
        line_items: [{ id: 'li_123' }],
      },
      checkout: { url: 'https://checkout.paddle.com/test' },
      payments: [],
      created_at: '2024-01-01T00:00:00Z',
    })),
    createTransaction: vi.fn(() => Promise.resolve({
      id: 'txn_test123',
      checkout: { url: 'https://checkout.paddle.com/test' },
    })),
    createAdjustment: vi.fn(() => Promise.resolve({
      id: 'adj_test123',
      status: 'approved',
      currency_code: 'USD',
      totals: { total: '1499' },
    })),
    verifyWebhookSignature: vi.fn(() => true),
    parseWebhookSignature: vi.fn(() => ({ ts: '123456', h1: 'sig' })),
  };
});

describe('Paddle Gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Provider Information', () => {
    it('should have PADDLE as provider', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');
      const gateway = new PaddleGateway();
      expect(gateway.provider).toBe(PaymentProvider.PADDLE);
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with correct parameters', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'FREE',
        providerCustomerId: 'ctm_test123',
      });
      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});

      const result = await gateway.createCheckoutSession({
        userId: 'user123',
        userEmail: 'test@example.com',
        userName: 'Test User',
        tier: SubscriptionTier.PRO,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result).toHaveProperty('sessionId', 'txn_test123');
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('checkout.paddle.com');
      expect(result).toHaveProperty('provider', PaymentProvider.PADDLE);
      expect(result).toHaveProperty('expiresAt');
    });

    it('should throw error for free tier', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      await expect(
        gateway.createCheckoutSession({
          userId: 'user123',
          userEmail: 'test@example.com',
          tier: SubscriptionTier.FREE,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Cannot create checkout for free tier');
    });
  });

  describe('Customer Portal', () => {
    it('should return Paddle management URL if available', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue({
        providerSubscriptionId: 'sub_test123',
      });

      const result = await gateway.createCustomerPortalSession({
        userId: 'user123',
        returnUrl: 'https://example.com/billing',
      });

      expect(result).toHaveProperty('url', 'https://paddle.com/update');
      expect(result).toHaveProperty('provider', PaymentProvider.PADDLE);
    });

    it('should return fallback URL if no subscription', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await gateway.createCustomerPortalSession({
        userId: 'user123',
        returnUrl: 'https://example.com/billing',
      });

      expect(result).toHaveProperty('url', 'https://example.com/billing');
    });
  });

  describe('Subscription Management', () => {
    it('should get subscription from Paddle API', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      const result = await gateway.getSubscription('sub_test123');

      expect(result).toMatchObject({
        id: 'sub_test123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.PADDLE,
      });
    });

    it('should cancel subscription at period end', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');
      const { cancelSubscription } = await import('@/lib/payments/paddle/client');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.updateMany.mockResolvedValue({});

      await gateway.cancelSubscription('sub_test123', false);

      expect(cancelSubscription).toHaveBeenCalledWith('sub_test123', 'next_billing_period');
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancelAtPeriodEnd: true,
          }),
        })
      );
    });

    it('should cancel subscription immediately', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');
      const { cancelSubscription } = await import('@/lib/payments/paddle/client');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.updateMany.mockResolvedValue({});

      await gateway.cancelSubscription('sub_test123', true);

      expect(cancelSubscription).toHaveBeenCalledWith('sub_test123', 'immediately');
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.CANCELED,
          }),
        })
      );
    });

    it('should resume subscription', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');
      const { resumeSubscription } = await import('@/lib/payments/paddle/client');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.updateMany.mockResolvedValue({});

      await gateway.resumeSubscription('sub_test123');

      expect(resumeSubscription).toHaveBeenCalledWith('sub_test123');
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancelAtPeriodEnd: false,
            status: SubscriptionStatus.ACTIVE,
          }),
        })
      );
    });
  });

  describe('Payment Methods', () => {
    it('should list payment methods from database', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        providerCustomerId: 'ctm_test123',
        paymentMethods: [
          {
            id: 'pm_123',
            userId: 'user123',
            provider: 'PADDLE',
            type: 'CARD',
            isDefault: true,
            cardBrand: 'visa',
            cardLast4: '4242',
            cardExpMonth: 12,
            cardExpYear: 2025,
          },
        ],
      });

      const methods = await gateway.listPaymentMethods('ctm_test123');

      expect(methods).toHaveLength(1);
      expect(methods[0]).toMatchObject({
        id: 'pm_123',
        provider: PaymentProvider.PADDLE,
        type: PaymentMethodType.CARD,
        isDefault: true,
        cardBrand: 'visa',
        cardLast4: '4242',
      });
    });

    it('should delete payment method from database', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.paymentMethod.delete.mockResolvedValue({});

      await gateway.deletePaymentMethod('pm_123');

      expect(mockPrisma.paymentMethod.delete).toHaveBeenCalledWith({
        where: { id: 'pm_123' },
      });
    });
  });

  describe('Refunds', () => {
    it('should create refund adjustment', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay_123',
        userId: 'user123',
        amount: 1499,
        currency: 'USD',
        refundedAmount: 0,
        providerPaymentId: 'txn_test123',
      });

      mockPrisma.payment.update.mockResolvedValue({});

      const result = await gateway.refundPayment({
        paymentId: 'pay_123',
      });

      expect(result).toMatchObject({
        id: 'adj_test123',
        paymentId: 'pay_123',
        amount: 1499,
        currency: 'USD',
        provider: PaymentProvider.PADDLE,
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_123' },
        data: expect.objectContaining({
          refundedAmount: 1499,
          status: PaymentStatus.REFUNDED,
        }),
      });
    });
  });

  describe('Customer Management', () => {
    it('should create new Paddle customer', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.upsert.mockResolvedValue({});

      const customerId = await gateway.createCustomer(
        'user123',
        'test@example.com',
        'Test User'
      );

      expect(customerId).toBe('ctm_test123');

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123' },
          create: expect.objectContaining({
            userId: 'user123',
            tier: SubscriptionTier.FREE,
            provider: PaymentProvider.PADDLE,
            providerCustomerId: 'ctm_test123',
          }),
        })
      );
    });

    it('should return existing customer if found', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');
      const { listCustomers } = await import('@/lib/payments/paddle/client');

      vi.mocked(listCustomers).mockResolvedValue([
        { id: 'ctm_existing', email: 'test@example.com', name: 'Existing' } as never,
      ]);

      const gateway = new PaddleGateway();

      mockPrisma.subscription.upsert.mockResolvedValue({});

      const customerId = await gateway.createCustomer(
        'user123',
        'test@example.com',
        'Test User'
      );

      expect(customerId).toBe('ctm_existing');
    });

    it('should delete customer reference from database', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      mockPrisma.subscription.updateMany.mockResolvedValue({});

      await gateway.deleteCustomer('ctm_test123');

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { providerCustomerId: 'ctm_test123' },
        data: { providerCustomerId: null },
      });
    });
  });

  describe('Webhook Handling', () => {
    it('should handle subscription.activated webhook', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      const webhookPayload = {
        event_id: 'evt_123',
        event_type: 'subscription.activated',
        data: {
          id: 'sub_new123',
          customer_id: 'ctm_test123',
          custom_data: { user_id: 'user123' },
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2024-02-01T00:00:00Z',
          },
          items: [
            { price: { custom_data: { tier: 'PRO' } } },
          ],
        },
      };

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.subscription.upsert.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'signature');

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123' },
          create: expect.objectContaining({
            tier: 'PRO',
            status: SubscriptionStatus.ACTIVE,
            provider: PaymentProvider.PADDLE,
          }),
        })
      );
    });

    it('should handle subscription.canceled webhook', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      const webhookPayload = {
        event_id: 'evt_123',
        event_type: 'subscription.canceled',
        data: {
          id: 'sub_test123',
        },
      };

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.subscription.updateMany.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'signature');

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { providerSubscriptionId: 'sub_test123' },
          data: expect.objectContaining({
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.CANCELED,
          }),
        })
      );
    });

    it('should handle transaction.completed webhook', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      const webhookPayload = {
        event_id: 'evt_123',
        event_type: 'transaction.completed',
        data: {
          id: 'txn_new123',
          custom_data: { user_id: 'user123', tier: 'STARTER' },
          details: {
            totals: { total: '499', currency_code: 'USD' },
          },
          payments: [
            {
              method_details: {
                type: 'card',
                card: {
                  last4: '4242',
                  type: 'visa',
                  expiry_month: 12,
                  expiry_year: 2025,
                },
              },
            },
          ],
        },
      };

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});
      mockPrisma.paymentMethod.upsert.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'signature');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          amount: 499,
          status: PaymentStatus.COMPLETED,
          provider: PaymentProvider.PADDLE,
        }),
      });

      expect(mockPrisma.paymentMethod.upsert).toHaveBeenCalled();
    });

    it('should handle transaction.payment_failed webhook', async () => {
      const { PaddleGateway } = await import('@/lib/payments/paddle');

      const gateway = new PaddleGateway();

      const webhookPayload = {
        event_id: 'evt_123',
        event_type: 'transaction.payment_failed',
        data: {
          id: 'txn_failed123',
          custom_data: { user_id: 'user123' },
          details: {
            totals: { total: '1499', currency_code: 'USD' },
          },
          payments: [
            { error_code: 'card_declined' },
          ],
        },
      };

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'signature');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.PADDLE,
          failureReason: 'card_declined',
        }),
      });
    });
  });
});
