/**
 * Paymob Gateway Unit Tests
 * Tests for Paymob payment gateway implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PaymentProvider,
  SubscriptionTier,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethodType,
} from '@/lib/payments/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
    findMany: vi.fn(),
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

// Mock environment variables
vi.mock('@/lib/payments/paymob/client', async () => {
  const actual = await vi.importActual('@/lib/payments/paymob/client');
  return {
    ...actual,
    getPaymobApiKey: vi.fn(() => 'test_api_key'),
    getPaymobHmacSecret: vi.fn(() => 'test_hmac_secret'),
    getPaymobIntegrationIds: vi.fn(() => ({
      card: '12345',
      wallet: '12346',
      kiosk: '12347',
    })),
    isPaymobConfigured: vi.fn(() => true),
    getAuthToken: vi.fn(() => Promise.resolve('test_auth_token')),
    createOrder: vi.fn(() => Promise.resolve({
      id: 123456,
      merchant_order_id: 'test_order',
      amount_cents: 24000,
      currency: 'EGP',
    })),
    createPaymentKey: vi.fn(() => Promise.resolve({
      token: 'test_payment_key',
    })),
    refundTransaction: vi.fn(() => Promise.resolve({
      id: 789,
      success: true,
      amount_cents: 24000,
      currency: 'EGP',
    })),
    getTransaction: vi.fn(() => Promise.resolve({
      id: 123456,
      success: true,
      pending: false,
      is_voided: false,
      is_refunded: false,
      amount_cents: 24000,
      currency: 'EGP',
      created_at: '2024-01-01T00:00:00Z',
    })),
    verifyWebhookSignature: vi.fn(() => true),
  };
});

describe('Paymob Gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMOB_IFRAME_ID = 'test_iframe_id';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Provider Information', () => {
    it('should have PAYMOB as provider', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');
      const gateway = new PaymobGateway();
      expect(gateway.provider).toBe(PaymentProvider.PAYMOB);
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with correct parameters', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      // Mock no existing subscription
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'FREE',
        providerCustomerId: 'paymob_user123_123456',
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

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('payment_token');
      expect(result).toHaveProperty('provider', PaymentProvider.PAYMOB);
      expect(result).toHaveProperty('expiresAt');
    });

    it('should throw error for free tier', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue({
        providerCustomerId: 'paymob_user123',
      });

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
    it('should return billing page URL', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      const result = await gateway.createCustomerPortalSession({
        userId: 'user123',
        returnUrl: 'https://example.com/billing',
      });

      expect(result).toHaveProperty('url', 'https://example.com/billing');
      expect(result).toHaveProperty('provider', PaymentProvider.PAYMOB);
    });

    it('should use default billing URL if not provided', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      const result = await gateway.createCustomerPortalSession({
        userId: 'user123',
      });

      expect(result).toHaveProperty('url', '/billing');
    });
  });

  describe('Subscription Management', () => {
    it('should get subscription from database', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      const mockSubscription = {
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        status: 'ACTIVE',
        providerSubscriptionId: '123456',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        trialEnd: null,
      };

      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);

      const result = await gateway.getSubscription('123456');

      expect(result).toMatchObject({
        id: 'sub_123',
        userId: 'user123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.PAYMOB,
      });
    });

    it('should return null for non-existent subscription', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await gateway.getSubscription('non_existent');

      expect(result).toBeNull();
    });

    it('should cancel subscription immediately', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        providerSubscriptionId: '123456',
      });

      mockPrisma.subscription.update.mockResolvedValue({});

      await gateway.cancelSubscription('123456', true);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.CANCELED,
            cancelAtPeriodEnd: false,
          }),
        })
      );
    });

    it('should cancel subscription at period end', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        providerSubscriptionId: '123456',
      });

      mockPrisma.subscription.update.mockResolvedValue({});

      await gateway.cancelSubscription('123456', false);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancelAtPeriodEnd: true,
          }),
        })
      );
    });

    it('should resume subscription', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        providerSubscriptionId: '123456',
        cancelAtPeriodEnd: true,
      });

      mockPrisma.subscription.update.mockResolvedValue({});

      await gateway.resumeSubscription('123456');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancelAtPeriodEnd: false,
            status: SubscriptionStatus.ACTIVE,
          }),
        })
      );
    });
  });

  describe('Refunds', () => {
    it('should create full refund', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay_123',
        userId: 'user123',
        amount: 24000,
        refundedAmount: 0,
        providerPaymentId: 'txn_123456',
      });

      mockPrisma.payment.update.mockResolvedValue({});

      const result = await gateway.refundPayment({
        paymentId: 'pay_123',
      });

      expect(result).toMatchObject({
        id: '789',
        paymentId: 'pay_123',
        amount: 24000,
        currency: 'EGP',
        provider: PaymentProvider.PAYMOB,
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_123' },
        data: expect.objectContaining({
          refundedAmount: 24000,
          status: PaymentStatus.REFUNDED,
        }),
      });
    });

    it('should create partial refund', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');
      const { refundTransaction } = await import('@/lib/payments/paymob/client');

      const gateway = new PaymobGateway();

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay_123',
        userId: 'user123',
        amount: 24000,
        refundedAmount: 0,
        providerPaymentId: 'txn_123456',
      });

      vi.mocked(refundTransaction).mockResolvedValue({
        id: 790,
        success: true,
        amount_cents: 12000,
        currency: 'EGP',
      } as never);

      mockPrisma.payment.update.mockResolvedValue({});

      const result = await gateway.refundPayment({
        paymentId: 'pay_123',
        amount: 12000,
        reason: 'Partial refund requested',
      });

      expect(result.amount).toBe(12000);

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_123' },
        data: expect.objectContaining({
          refundedAmount: 12000,
          status: PaymentStatus.PARTIALLY_REFUNDED,
        }),
      });
    });
  });

  describe('Customer Management', () => {
    it('should create customer reference', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.upsert.mockResolvedValue({});

      const customerId = await gateway.createCustomer(
        'user123',
        'test@example.com',
        'Test User'
      );

      expect(customerId).toContain('paymob_user123_');

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123' },
          create: expect.objectContaining({
            userId: 'user123',
            tier: SubscriptionTier.FREE,
            provider: PaymentProvider.PAYMOB,
          }),
        })
      );
    });

    it('should delete customer reference', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.updateMany.mockResolvedValue({});

      await gateway.deleteCustomer('paymob_user123_123456');

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { providerCustomerId: 'paymob_user123_123456' },
        data: { providerCustomerId: null },
      });
    });
  });

  describe('Payment Methods', () => {
    it('should list payment methods from database', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        userId: 'user123',
        providerCustomerId: 'paymob_user123',
      });

      mockPrisma.paymentMethod.findMany.mockResolvedValue([
        {
          id: 'pm_123',
          userId: 'user123',
          provider: 'PAYMOB',
          type: 'CARD',
          isDefault: true,
          cardBrand: 'visa',
          cardLast4: '4242',
          cardExpMonth: 12,
          cardExpYear: 2025,
        },
      ]);

      const methods = await gateway.listPaymentMethods('paymob_user123');

      expect(methods).toHaveLength(1);
      expect(methods[0]).toMatchObject({
        id: 'pm_123',
        provider: PaymentProvider.PAYMOB,
        type: PaymentMethodType.CARD,
        isDefault: true,
        cardBrand: 'visa',
        cardLast4: '4242',
      });
    });

    it('should delete payment method from database', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.paymentMethod.delete.mockResolvedValue({});

      await gateway.deletePaymentMethod('pm_123');

      expect(mockPrisma.paymentMethod.delete).toHaveBeenCalledWith({
        where: { id: 'pm_123' },
      });
    });
  });

  describe('Webhook Handling', () => {
    it('should process successful payment webhook', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      const webhookPayload = {
        obj: {
          id: 123456,
          success: true,
          order: { id: 789 },
          source_data: {
            pan: '************4242',
            sub_type: 'Visa',
            type: 'card',
          },
        },
      };

      // Mock webhook event storage
      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.paymentWebhookEvent.findFirst.mockResolvedValue({
        id: 'evt_123',
        payload: {
          orderId: 789,
          merchantOrderId: 'sub_user123_123',
          userId: 'user123',
          tier: 'PRO',
          amountCents: 24000,
        },
      });
      mockPrisma.paymentWebhookEvent.update.mockResolvedValue({});
      mockPrisma.subscription.upsert.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});
      mockPrisma.paymentMethod.upsert.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'valid_hmac');

      // Should create subscription
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123' },
          create: expect.objectContaining({
            tier: 'PRO',
            status: SubscriptionStatus.ACTIVE,
          }),
        })
      );

      // Should record payment
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          amount: 24000,
          status: PaymentStatus.COMPLETED,
          provider: PaymentProvider.PAYMOB,
        }),
      });
    });

    it('should process failed payment webhook', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      const webhookPayload = {
        obj: {
          id: 123456,
          success: false,
          order: { id: 789 },
        },
      };

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.paymentWebhookEvent.findFirst.mockResolvedValue({
        id: 'evt_123',
        payload: {
          orderId: 789,
          userId: 'user123',
          tier: 'PRO',
          amountCents: 24000,
        },
      });
      mockPrisma.paymentWebhookEvent.update.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'valid_hmac');

      // Should record failed payment
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.PAYMOB,
        }),
      });

      // Should NOT update subscription
      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe('Wallet Payments', () => {
    it('should create wallet payment', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});

      const result = await gateway.createWalletPayment({
        userId: 'user123',
        userEmail: 'test@example.com',
        tier: SubscriptionTier.STARTER,
        walletPhone: '+201234567890',
      });

      expect(result).toHaveProperty('paymentUrl');
      expect(result).toHaveProperty('orderId');
      expect(result.paymentUrl).toContain('wallet_payment_url');
    });

    it('should throw error for free tier wallet payment', async () => {
      const { PaymobGateway } = await import('@/lib/payments/paymob');

      const gateway = new PaymobGateway();

      await expect(
        gateway.createWalletPayment({
          userId: 'user123',
          userEmail: 'test@example.com',
          tier: SubscriptionTier.FREE,
          walletPhone: '+201234567890',
        })
      ).rejects.toThrow('Cannot create payment for free tier');
    });
  });
});
