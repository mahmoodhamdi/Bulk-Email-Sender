/**
 * PayTabs Gateway Unit Tests
 * Tests for PayTabs payment gateway implementation
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

// Mock environment variables and client functions
vi.mock('@/lib/payments/paytabs/client', async () => {
  const actual = await vi.importActual('@/lib/payments/paytabs/client');
  return {
    ...actual,
    getPayTabsProfileId: vi.fn(() => '12345'),
    getPayTabsServerKey: vi.fn(() => 'test_server_key'),
    getPayTabsClientKey: vi.fn(() => 'test_client_key'),
    getPayTabsRegion: vi.fn(() => 'SAU'),
    isPayTabsConfigured: vi.fn(() => true),
    createPaymentPage: vi.fn(() => Promise.resolve({
      tran_ref: 'TST2301100001',
      redirect_url: 'https://secure.paytabs.sa/payment/page/123',
      cart_id: 'test_cart',
    })),
    queryTransaction: vi.fn(() => Promise.resolve({
      tran_ref: 'TST2301100001',
      cart_id: 'test_cart',
      cart_amount: '56.00',
      cart_currency: 'SAR',
      payment_result: {
        response_status: 'A',
        response_code: '000',
        response_message: 'Authorised',
        transaction_time: '2024-01-01T00:00:00Z',
      },
      payment_info: {
        payment_method: 'creditcard',
        card_type: 'Credit',
        card_scheme: 'Visa',
        payment_description: '************4242',
      },
    })),
    refundTransaction: vi.fn(() => Promise.resolve({
      tran_ref: 'TST2301100002',
      previous_tran_ref: 'TST2301100001',
      cart_currency: 'SAR',
      payment_result: {
        response_status: 'A',
        response_code: '000',
        response_message: 'Refund successful',
      },
    })),
    deleteToken: vi.fn(() => Promise.resolve({ result: 'success' })),
    verifyCallbackSignature: vi.fn(() => true),
    isTransactionSuccessful: vi.fn(() => true),
  };
});

describe('PayTabs Gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Provider Information', () => {
    it('should have PAYTABS as provider', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');
      const gateway = new PayTabsGateway();
      expect(gateway.provider).toBe(PaymentProvider.PAYTABS);
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with correct parameters', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'FREE',
        providerCustomerId: 'paytabs_user123_123456',
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

      expect(result).toHaveProperty('sessionId', 'TST2301100001');
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('payment/page');
      expect(result).toHaveProperty('provider', PaymentProvider.PAYTABS);
      expect(result).toHaveProperty('expiresAt');
    });

    it('should throw error for free tier', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.findUnique.mockResolvedValue({
        providerCustomerId: 'paytabs_user123',
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
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      const result = await gateway.createCustomerPortalSession({
        userId: 'user123',
        returnUrl: 'https://example.com/billing',
      });

      expect(result).toHaveProperty('url', 'https://example.com/billing');
      expect(result).toHaveProperty('provider', PaymentProvider.PAYTABS);
    });
  });

  describe('Subscription Management', () => {
    it('should get subscription from database', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      const mockSubscription = {
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        status: 'ACTIVE',
        providerSubscriptionId: 'TST2301100001',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        trialEnd: null,
      };

      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);

      const result = await gateway.getSubscription('TST2301100001');

      expect(result).toMatchObject({
        id: 'sub_123',
        userId: 'user123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.PAYTABS,
      });
    });

    it('should return null for non-existent subscription', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await gateway.getSubscription('non_existent');

      expect(result).toBeNull();
    });

    it('should cancel subscription immediately', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        providerSubscriptionId: 'TST2301100001',
      });

      mockPrisma.subscription.update.mockResolvedValue({});

      await gateway.cancelSubscription('TST2301100001', true);

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
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        providerSubscriptionId: 'TST2301100001',
      });

      mockPrisma.subscription.update.mockResolvedValue({});

      await gateway.cancelSubscription('TST2301100001', false);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancelAtPeriodEnd: true,
          }),
        })
      );
    });

    it('should resume subscription', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_123',
        userId: 'user123',
        tier: 'PRO',
        providerSubscriptionId: 'TST2301100001',
        cancelAtPeriodEnd: true,
      });

      mockPrisma.subscription.update.mockResolvedValue({});

      await gateway.resumeSubscription('TST2301100001');

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

  describe('Payment Methods', () => {
    it('should list payment methods from database', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.findFirst.mockResolvedValue({
        providerCustomerId: 'paytabs_user123',
        paymentMethods: [
          {
            id: 'pm_123',
            userId: 'user123',
            provider: 'PAYTABS',
            type: 'CARD',
            isDefault: true,
            cardBrand: 'Visa',
            cardLast4: '4242',
            cardExpMonth: 12,
            cardExpYear: 2025,
          },
        ],
      });

      const methods = await gateway.listPaymentMethods('paytabs_user123');

      expect(methods).toHaveLength(1);
      expect(methods[0]).toMatchObject({
        id: 'pm_123',
        provider: PaymentProvider.PAYTABS,
        type: PaymentMethodType.CARD,
        isDefault: true,
        cardBrand: 'Visa',
        cardLast4: '4242',
      });
    });

    it('should delete payment method and token', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');
      const { deleteToken } = await import('@/lib/payments/paytabs/client');

      const gateway = new PayTabsGateway();

      mockPrisma.paymentMethod.findUnique.mockResolvedValue({
        id: 'pm_123',
        providerMethodId: 'token_123',
      });
      mockPrisma.paymentMethod.delete.mockResolvedValue({});

      await gateway.deletePaymentMethod('pm_123');

      expect(deleteToken).toHaveBeenCalledWith('token_123');
      expect(mockPrisma.paymentMethod.delete).toHaveBeenCalledWith({
        where: { id: 'pm_123' },
      });
    });
  });

  describe('Refunds', () => {
    it('should create full refund', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay_123',
        userId: 'user123',
        amount: 5600,
        currency: 'SAR',
        refundedAmount: 0,
        providerPaymentId: 'TST2301100001',
      });

      mockPrisma.payment.update.mockResolvedValue({});

      const result = await gateway.refundPayment({
        paymentId: 'pay_123',
      });

      expect(result).toMatchObject({
        id: 'TST2301100002',
        paymentId: 'pay_123',
        amount: 5600,
        currency: 'SAR',
        provider: PaymentProvider.PAYTABS,
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_123' },
        data: expect.objectContaining({
          refundedAmount: 5600,
          status: PaymentStatus.REFUNDED,
        }),
      });
    });

    it('should create partial refund', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay_123',
        userId: 'user123',
        amount: 5600,
        currency: 'SAR',
        refundedAmount: 0,
        providerPaymentId: 'TST2301100001',
      });

      mockPrisma.payment.update.mockResolvedValue({});

      const result = await gateway.refundPayment({
        paymentId: 'pay_123',
        amount: 2800,
        reason: 'Partial refund requested',
      });

      expect(result.amount).toBe(2800);

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_123' },
        data: expect.objectContaining({
          refundedAmount: 2800,
          status: PaymentStatus.PARTIALLY_REFUNDED,
        }),
      });
    });
  });

  describe('Customer Management', () => {
    it('should create customer reference', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.upsert.mockResolvedValue({});

      const customerId = await gateway.createCustomer(
        'user123',
        'test@example.com',
        'Test User'
      );

      expect(customerId).toContain('paytabs_user123_');

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123' },
          create: expect.objectContaining({
            userId: 'user123',
            tier: SubscriptionTier.FREE,
            provider: PaymentProvider.PAYTABS,
          }),
        })
      );
    });

    it('should delete customer reference', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      mockPrisma.subscription.updateMany.mockResolvedValue({});

      await gateway.deleteCustomer('paytabs_user123_123456');

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { providerCustomerId: 'paytabs_user123_123456' },
        data: { providerCustomerId: null },
      });
    });
  });

  describe('Webhook Handling', () => {
    it('should process successful payment webhook', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      const webhookPayload = {
        tran_ref: 'TST2301100001',
        cart_id: 'sub_user123_123',
        cart_currency: 'SAR',
        payment_result: {
          response_status: 'A',
          response_code: '000',
          response_message: 'Authorised',
        },
        payment_info: {
          payment_method: 'creditcard',
          card_scheme: 'Visa',
          payment_description: '************4242',
        },
        token: 'token_123',
      };

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.paymentWebhookEvent.findFirst.mockResolvedValue({
        id: 'evt_123',
        payload: {
          cartId: 'sub_user123_123',
          userId: 'user123',
          tier: 'PRO',
          amount: 5600,
        },
      });
      mockPrisma.paymentWebhookEvent.update.mockResolvedValue({});
      mockPrisma.subscription.upsert.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});
      mockPrisma.paymentMethod.upsert.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'signature');

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123' },
          create: expect.objectContaining({
            tier: 'PRO',
            status: SubscriptionStatus.ACTIVE,
          }),
        })
      );

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          amount: 5600,
          status: PaymentStatus.COMPLETED,
          provider: PaymentProvider.PAYTABS,
        }),
      });

      expect(mockPrisma.paymentMethod.upsert).toHaveBeenCalled();
    });

    it('should process failed payment webhook', async () => {
      const { PayTabsGateway } = await import('@/lib/payments/paytabs');

      const gateway = new PayTabsGateway();

      const webhookPayload = {
        tran_ref: 'TST2301100001',
        cart_id: 'sub_user123_123',
        cart_currency: 'SAR',
        payment_result: {
          response_status: 'D',
          response_code: '123',
          response_message: 'Declined',
        },
      };

      mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
      mockPrisma.paymentWebhookEvent.findFirst.mockResolvedValue({
        id: 'evt_123',
        payload: {
          cartId: 'sub_user123_123',
          userId: 'user123',
          tier: 'PRO',
          amount: 5600,
        },
      });
      mockPrisma.paymentWebhookEvent.update.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});

      await gateway.handleWebhook(webhookPayload, 'signature');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.PAYTABS,
          failureReason: 'Declined',
        }),
      });

      // Should NOT update subscription
      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
    });
  });
});
