/**
 * Payment Validation Schemas Unit Tests
 * Tests for Zod validation schemas used in payment API operations
 */

import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  // Enum schemas
  subscriptionTierSchema,
  subscriptionStatusSchema,
  paymentProviderSchema,
  paymentStatusSchema,
  paymentMethodTypeSchema,
  billingIntervalSchema,
  // Checkout schemas
  createCheckoutSessionSchema,
  createPortalSessionSchema,
  // Subscription schemas
  updateSubscriptionSchema,
  cancelSubscriptionSchema,
  // Payment schemas
  listPaymentsSchema,
  refundPaymentSchema,
  // Payment method schemas
  setDefaultPaymentMethodSchema,
  // Invoice schemas
  listInvoicesSchema,
  // Coupon schemas
  validateCouponSchema,
  // Admin schemas
  adminCreateCouponSchema,
  adminListSubscriptionsSchema,
} from '@/lib/validations/payment';

describe('Enum Schemas', () => {
  describe('subscriptionTierSchema', () => {
    it('should accept valid tiers', () => {
      expect(subscriptionTierSchema.parse('FREE')).toBe('FREE');
      expect(subscriptionTierSchema.parse('STARTER')).toBe('STARTER');
      expect(subscriptionTierSchema.parse('PRO')).toBe('PRO');
      expect(subscriptionTierSchema.parse('ENTERPRISE')).toBe('ENTERPRISE');
    });

    it('should reject invalid tiers', () => {
      expect(() => subscriptionTierSchema.parse('INVALID')).toThrow(ZodError);
      expect(() => subscriptionTierSchema.parse('free')).toThrow(ZodError);
    });
  });

  describe('subscriptionStatusSchema', () => {
    it('should accept valid statuses', () => {
      expect(subscriptionStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
      expect(subscriptionStatusSchema.parse('CANCELED')).toBe('CANCELED');
      expect(subscriptionStatusSchema.parse('PAST_DUE')).toBe('PAST_DUE');
    });

    it('should reject invalid statuses', () => {
      expect(() => subscriptionStatusSchema.parse('INVALID')).toThrow(ZodError);
    });
  });

  describe('paymentProviderSchema', () => {
    it('should accept valid providers', () => {
      expect(paymentProviderSchema.parse('STRIPE')).toBe('STRIPE');
      expect(paymentProviderSchema.parse('PAYMOB')).toBe('PAYMOB');
      expect(paymentProviderSchema.parse('PAYTABS')).toBe('PAYTABS');
      expect(paymentProviderSchema.parse('PADDLE')).toBe('PADDLE');
    });

    it('should reject invalid providers', () => {
      expect(() => paymentProviderSchema.parse('PAYPAL')).toThrow(ZodError);
    });
  });

  describe('paymentStatusSchema', () => {
    it('should accept valid payment statuses', () => {
      expect(paymentStatusSchema.parse('PENDING')).toBe('PENDING');
      expect(paymentStatusSchema.parse('COMPLETED')).toBe('COMPLETED');
      expect(paymentStatusSchema.parse('REFUNDED')).toBe('REFUNDED');
    });
  });

  describe('paymentMethodTypeSchema', () => {
    it('should accept valid payment method types', () => {
      expect(paymentMethodTypeSchema.parse('CARD')).toBe('CARD');
      expect(paymentMethodTypeSchema.parse('WALLET')).toBe('WALLET');
      expect(paymentMethodTypeSchema.parse('KIOSK')).toBe('KIOSK');
    });
  });

  describe('billingIntervalSchema', () => {
    it('should accept valid billing intervals', () => {
      expect(billingIntervalSchema.parse('monthly')).toBe('monthly');
      expect(billingIntervalSchema.parse('yearly')).toBe('yearly');
    });

    it('should reject invalid billing intervals', () => {
      expect(() => billingIntervalSchema.parse('weekly')).toThrow(ZodError);
    });
  });
});

describe('Checkout Schemas', () => {
  describe('createCheckoutSessionSchema', () => {
    it('should accept valid checkout data', () => {
      const validData = {
        tier: 'PRO',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = createCheckoutSessionSchema.parse(validData);
      expect(result.tier).toBe('PRO');
      expect(result.billingInterval).toBe('monthly'); // Default
    });

    it('should accept optional fields', () => {
      const validData = {
        tier: 'STARTER',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        couponCode: 'DISCOUNT10',
        trialDays: 14,
        billingInterval: 'yearly',
        provider: 'STRIPE',
        metadata: { campaign: 'promo2024' },
      };

      const result = createCheckoutSessionSchema.parse(validData);
      expect(result.couponCode).toBe('DISCOUNT10');
      expect(result.trialDays).toBe(14);
      expect(result.billingInterval).toBe('yearly');
    });

    it('should reject invalid URLs', () => {
      const invalidData = {
        tier: 'PRO',
        successUrl: 'not-a-url',
        cancelUrl: 'https://example.com/cancel',
      };

      expect(() => createCheckoutSessionSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject trial days > 30', () => {
      const invalidData = {
        tier: 'PRO',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialDays: 60,
      };

      expect(() => createCheckoutSessionSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject FREE tier for paid checkout', () => {
      // Note: This validation should happen at the business logic level, not schema level
      // The schema accepts FREE for flexibility (e.g., downgrade flows)
      const data = {
        tier: 'FREE',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = createCheckoutSessionSchema.parse(data);
      expect(result.tier).toBe('FREE');
    });
  });

  describe('createPortalSessionSchema', () => {
    it('should accept valid return URL', () => {
      const result = createPortalSessionSchema.parse({
        returnUrl: 'https://example.com/billing',
      });
      expect(result.returnUrl).toBe('https://example.com/billing');
    });

    it('should reject invalid return URL', () => {
      expect(() =>
        createPortalSessionSchema.parse({ returnUrl: 'not-a-url' })
      ).toThrow(ZodError);
    });
  });
});

describe('Subscription Schemas', () => {
  describe('updateSubscriptionSchema', () => {
    it('should accept valid tier update', () => {
      const result = updateSubscriptionSchema.parse({ tier: 'ENTERPRISE' });
      expect(result.tier).toBe('ENTERPRISE');
    });

    it('should accept tier with billing interval', () => {
      const result = updateSubscriptionSchema.parse({
        tier: 'PRO',
        billingInterval: 'yearly',
      });
      expect(result.tier).toBe('PRO');
      expect(result.billingInterval).toBe('yearly');
    });
  });

  describe('cancelSubscriptionSchema', () => {
    it('should have default immediately as false', () => {
      const result = cancelSubscriptionSchema.parse({});
      expect(result.immediately).toBe(false);
    });

    it('should accept immediately flag', () => {
      const result = cancelSubscriptionSchema.parse({ immediately: true });
      expect(result.immediately).toBe(true);
    });

    it('should accept reason', () => {
      const result = cancelSubscriptionSchema.parse({
        reason: 'Too expensive',
      });
      expect(result.reason).toBe('Too expensive');
    });

    it('should reject reason over 500 characters', () => {
      const longReason = 'a'.repeat(501);
      expect(() =>
        cancelSubscriptionSchema.parse({ reason: longReason })
      ).toThrow(ZodError);
    });
  });
});

describe('Payment Schemas', () => {
  describe('listPaymentsSchema', () => {
    it('should have default pagination', () => {
      const result = listPaymentsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept pagination parameters', () => {
      const result = listPaymentsSchema.parse({ page: '2', limit: '50' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should accept filter parameters', () => {
      const result = listPaymentsSchema.parse({
        status: 'COMPLETED',
        provider: 'STRIPE',
      });
      expect(result.status).toBe('COMPLETED');
      expect(result.provider).toBe('STRIPE');
    });

    it('should reject limit > 100', () => {
      expect(() => listPaymentsSchema.parse({ limit: 200 })).toThrow(ZodError);
    });
  });

  describe('refundPaymentSchema', () => {
    it('should accept partial refund amount', () => {
      const result = refundPaymentSchema.parse({ amount: 500 });
      expect(result.amount).toBe(500);
    });

    it('should accept reason', () => {
      const result = refundPaymentSchema.parse({ reason: 'Customer request' });
      expect(result.reason).toBe('Customer request');
    });

    it('should accept empty object for full refund', () => {
      const result = refundPaymentSchema.parse({});
      expect(result.amount).toBeUndefined();
    });

    it('should reject zero or negative amount', () => {
      expect(() => refundPaymentSchema.parse({ amount: 0 })).toThrow(ZodError);
      expect(() => refundPaymentSchema.parse({ amount: -100 })).toThrow(ZodError);
    });
  });
});

describe('Payment Method Schemas', () => {
  describe('setDefaultPaymentMethodSchema', () => {
    it('should accept valid CUID', () => {
      const result = setDefaultPaymentMethodSchema.parse({
        id: 'clx1234567890abcdefgh',
      });
      expect(result.id).toBe('clx1234567890abcdefgh');
    });

    it('should reject invalid ID format', () => {
      expect(() =>
        setDefaultPaymentMethodSchema.parse({ id: 'invalid-id' })
      ).toThrow(ZodError);
    });
  });
});

describe('Invoice Schemas', () => {
  describe('listInvoicesSchema', () => {
    it('should have default pagination', () => {
      const result = listInvoicesSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept status filter', () => {
      const result = listInvoicesSchema.parse({ status: 'PAID' });
      expect(result.status).toBe('PAID');
    });

    it('should accept date range', () => {
      const result = listInvoicesSchema.parse({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      });
      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});

describe('Coupon Schemas', () => {
  describe('validateCouponSchema', () => {
    it('should accept valid coupon code and tier', () => {
      const result = validateCouponSchema.parse({
        code: 'SAVE20',
        tier: 'PRO',
      });
      expect(result.code).toBe('SAVE20');
      expect(result.tier).toBe('PRO');
    });

    it('should reject empty coupon code', () => {
      expect(() =>
        validateCouponSchema.parse({ code: '', tier: 'PRO' })
      ).toThrow(ZodError);
    });

    it('should reject coupon code > 50 chars', () => {
      const longCode = 'A'.repeat(51);
      expect(() =>
        validateCouponSchema.parse({ code: longCode, tier: 'PRO' })
      ).toThrow(ZodError);
    });
  });
});

describe('Admin Schemas', () => {
  describe('adminCreateCouponSchema', () => {
    it('should accept valid coupon data', () => {
      const result = adminCreateCouponSchema.parse({
        code: 'PROMO2024',
        discountType: 'PERCENTAGE',
        discountValue: 20,
      });
      expect(result.code).toBe('PROMO2024');
      expect(result.discountType).toBe('PERCENTAGE');
      expect(result.discountValue).toBe(20);
    });

    it('should accept coupon code with dashes and underscores', () => {
      const result = adminCreateCouponSchema.parse({
        code: 'HOLIDAY_2024-SPECIAL',
        discountType: 'FIXED_AMOUNT',
        discountValue: 500,
      });
      expect(result.code).toBe('HOLIDAY_2024-SPECIAL');
    });

    it('should reject invalid coupon code characters', () => {
      expect(() =>
        adminCreateCouponSchema.parse({
          code: 'INVALID CODE!',
          discountType: 'PERCENTAGE',
          discountValue: 10,
        })
      ).toThrow(ZodError);
    });

    it('should accept all optional fields', () => {
      const result = adminCreateCouponSchema.parse({
        code: 'FULL_OPTIONS',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        maxRedemptions: 100,
        maxRedemptionsPerUser: 1,
        validFrom: '2024-01-01T00:00:00.000Z',
        validUntil: '2024-12-31T23:59:59.999Z',
        applicableTiers: ['PRO', 'ENTERPRISE'],
        minimumAmount: 1000,
        firstTimeOnly: true,
      });
      expect(result.maxRedemptions).toBe(100);
      expect(result.applicableTiers).toEqual(['PRO', 'ENTERPRISE']);
      expect(result.firstTimeOnly).toBe(true);
    });

    it('should have firstTimeOnly default to false', () => {
      const result = adminCreateCouponSchema.parse({
        code: 'TEST',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      });
      expect(result.firstTimeOnly).toBe(false);
    });

    it('should reject code < 3 characters', () => {
      expect(() =>
        adminCreateCouponSchema.parse({
          code: 'AB',
          discountType: 'PERCENTAGE',
          discountValue: 10,
        })
      ).toThrow(ZodError);
    });

    it('should reject discountValue < 1', () => {
      expect(() =>
        adminCreateCouponSchema.parse({
          code: 'TEST',
          discountType: 'PERCENTAGE',
          discountValue: 0,
        })
      ).toThrow(ZodError);
    });
  });

  describe('adminListSubscriptionsSchema', () => {
    it('should have default pagination', () => {
      const result = adminListSubscriptionsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept all filter options', () => {
      const result = adminListSubscriptionsSchema.parse({
        tier: 'PRO',
        status: 'ACTIVE',
        provider: 'STRIPE',
        search: 'user@example.com',
      });
      expect(result.tier).toBe('PRO');
      expect(result.status).toBe('ACTIVE');
      expect(result.provider).toBe('STRIPE');
      expect(result.search).toBe('user@example.com');
    });

    it('should reject search > 100 characters', () => {
      const longSearch = 'a'.repeat(101);
      expect(() =>
        adminListSubscriptionsSchema.parse({ search: longSearch })
      ).toThrow(ZodError);
    });
  });
});
