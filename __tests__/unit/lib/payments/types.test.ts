/**
 * Payment Types Unit Tests
 * Tests for payment enums, tier configuration, and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  // Enums
  PaymentProvider,
  SubscriptionTier,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethodType,
  InvoiceStatus,
  DiscountType,
  // Tier configuration
  TIER_CONFIG,
  getTierConfig,
  getTierLimits,
  canAccessFeature,
  getUsageLimit,
  canUpgradeTo,
  canDowngradeTo,
  getPaidTiers,
  isPaidTier,
  formatPrice,
  calculateYearlySavings,
  calculateYearlySavingsPercentage,
  // Region-based selection
  getProviderForCountry,
  getCountriesForProvider,
  EGYPT_COUNTRIES,
  MENA_COUNTRIES,
  EU_COUNTRIES,
  // Webhook events
  PAYMENT_WEBHOOK_EVENTS,
} from '@/lib/payments/types';

describe('Payment Enums', () => {
  describe('PaymentProvider', () => {
    it('should have all payment providers', () => {
      expect(PaymentProvider.STRIPE).toBe('STRIPE');
      expect(PaymentProvider.PAYMOB).toBe('PAYMOB');
      expect(PaymentProvider.PAYTABS).toBe('PAYTABS');
      expect(PaymentProvider.PADDLE).toBe('PADDLE');
    });

    it('should have exactly 4 providers', () => {
      expect(Object.values(PaymentProvider)).toHaveLength(4);
    });
  });

  describe('SubscriptionTier', () => {
    it('should have all subscription tiers', () => {
      expect(SubscriptionTier.FREE).toBe('FREE');
      expect(SubscriptionTier.STARTER).toBe('STARTER');
      expect(SubscriptionTier.PRO).toBe('PRO');
      expect(SubscriptionTier.ENTERPRISE).toBe('ENTERPRISE');
    });

    it('should have exactly 4 tiers', () => {
      expect(Object.values(SubscriptionTier)).toHaveLength(4);
    });
  });

  describe('SubscriptionStatus', () => {
    it('should have all subscription statuses', () => {
      expect(SubscriptionStatus.ACTIVE).toBe('ACTIVE');
      expect(SubscriptionStatus.CANCELED).toBe('CANCELED');
      expect(SubscriptionStatus.PAST_DUE).toBe('PAST_DUE');
      expect(SubscriptionStatus.TRIALING).toBe('TRIALING');
      expect(SubscriptionStatus.PAUSED).toBe('PAUSED');
      expect(SubscriptionStatus.UNPAID).toBe('UNPAID');
    });
  });

  describe('PaymentStatus', () => {
    it('should have all payment statuses', () => {
      expect(PaymentStatus.PENDING).toBe('PENDING');
      expect(PaymentStatus.PROCESSING).toBe('PROCESSING');
      expect(PaymentStatus.COMPLETED).toBe('COMPLETED');
      expect(PaymentStatus.FAILED).toBe('FAILED');
      expect(PaymentStatus.REFUNDED).toBe('REFUNDED');
      expect(PaymentStatus.PARTIALLY_REFUNDED).toBe('PARTIALLY_REFUNDED');
    });
  });

  describe('PaymentMethodType', () => {
    it('should have all payment method types', () => {
      expect(PaymentMethodType.CARD).toBe('CARD');
      expect(PaymentMethodType.WALLET).toBe('WALLET');
      expect(PaymentMethodType.BANK_ACCOUNT).toBe('BANK_ACCOUNT');
      expect(PaymentMethodType.KIOSK).toBe('KIOSK');
    });
  });

  describe('InvoiceStatus', () => {
    it('should have all invoice statuses', () => {
      expect(InvoiceStatus.DRAFT).toBe('DRAFT');
      expect(InvoiceStatus.OPEN).toBe('OPEN');
      expect(InvoiceStatus.PAID).toBe('PAID');
      expect(InvoiceStatus.VOID).toBe('VOID');
      expect(InvoiceStatus.UNCOLLECTIBLE).toBe('UNCOLLECTIBLE');
    });
  });

  describe('DiscountType', () => {
    it('should have all discount types', () => {
      expect(DiscountType.PERCENTAGE).toBe('PERCENTAGE');
      expect(DiscountType.FIXED_AMOUNT).toBe('FIXED_AMOUNT');
    });
  });
});

describe('Tier Configuration', () => {
  describe('TIER_CONFIG', () => {
    it('should have configuration for all tiers', () => {
      expect(TIER_CONFIG[SubscriptionTier.FREE]).toBeDefined();
      expect(TIER_CONFIG[SubscriptionTier.STARTER]).toBeDefined();
      expect(TIER_CONFIG[SubscriptionTier.PRO]).toBeDefined();
      expect(TIER_CONFIG[SubscriptionTier.ENTERPRISE]).toBeDefined();
    });

    it('should have FREE tier with $0 price', () => {
      const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];
      expect(freeConfig.monthlyPrice).toBe(0);
      expect(freeConfig.yearlyPrice).toBe(0);
    });

    it('should have STARTER tier with $4.99 monthly price', () => {
      const starterConfig = TIER_CONFIG[SubscriptionTier.STARTER];
      expect(starterConfig.monthlyPrice).toBe(499);
      expect(starterConfig.yearlyPrice).toBe(4990);
    });

    it('should have PRO tier with $14.99 monthly price', () => {
      const proConfig = TIER_CONFIG[SubscriptionTier.PRO];
      expect(proConfig.monthlyPrice).toBe(1499);
      expect(proConfig.yearlyPrice).toBe(14990);
    });

    it('should have ENTERPRISE tier with $49.99 monthly price', () => {
      const enterpriseConfig = TIER_CONFIG[SubscriptionTier.ENTERPRISE];
      expect(enterpriseConfig.monthlyPrice).toBe(4999);
      expect(enterpriseConfig.yearlyPrice).toBe(49990);
    });

    it('should have correct email limits for each tier', () => {
      expect(TIER_CONFIG[SubscriptionTier.FREE].limits.emailsPerMonth).toBe(100);
      expect(TIER_CONFIG[SubscriptionTier.STARTER].limits.emailsPerMonth).toBe(5000);
      expect(TIER_CONFIG[SubscriptionTier.PRO].limits.emailsPerMonth).toBe(50000);
      expect(TIER_CONFIG[SubscriptionTier.ENTERPRISE].limits.emailsPerMonth).toBeNull(); // Unlimited
    });

    it('should have correct contact limits for each tier', () => {
      expect(TIER_CONFIG[SubscriptionTier.FREE].limits.contacts).toBe(500);
      expect(TIER_CONFIG[SubscriptionTier.STARTER].limits.contacts).toBe(5000);
      expect(TIER_CONFIG[SubscriptionTier.PRO].limits.contacts).toBe(50000);
      expect(TIER_CONFIG[SubscriptionTier.ENTERPRISE].limits.contacts).toBeNull(); // Unlimited
    });
  });

  describe('getTierConfig', () => {
    it('should return tier configuration', () => {
      const config = getTierConfig(SubscriptionTier.PRO);
      expect(config.name).toBe('Pro');
      expect(config.monthlyPrice).toBe(1499);
    });
  });

  describe('getTierLimits', () => {
    it('should return tier limits', () => {
      const limits = getTierLimits(SubscriptionTier.STARTER);
      expect(limits.emailsPerMonth).toBe(5000);
      expect(limits.smtpConfigs).toBe(3);
    });
  });

  describe('canAccessFeature', () => {
    it('should return true for available features', () => {
      expect(canAccessFeature(SubscriptionTier.PRO, 'abTesting')).toBe(true);
      expect(canAccessFeature(SubscriptionTier.PRO, 'automation')).toBe(true);
      expect(canAccessFeature(SubscriptionTier.PRO, 'apiAccess')).toBe(true);
    });

    it('should return false for unavailable features', () => {
      expect(canAccessFeature(SubscriptionTier.FREE, 'abTesting')).toBe(false);
      expect(canAccessFeature(SubscriptionTier.FREE, 'automation')).toBe(false);
      expect(canAccessFeature(SubscriptionTier.STARTER, 'apiAccess')).toBe(false);
    });

    it('should return true for unlimited features (null)', () => {
      expect(canAccessFeature(SubscriptionTier.ENTERPRISE, 'emailsPerMonth')).toBe(true);
      expect(canAccessFeature(SubscriptionTier.PRO, 'templates')).toBe(true);
    });

    it('should return true for features with numeric limits > 0', () => {
      expect(canAccessFeature(SubscriptionTier.FREE, 'smtpConfigs')).toBe(true);
    });
  });

  describe('getUsageLimit', () => {
    it('should return numeric limits', () => {
      expect(getUsageLimit(SubscriptionTier.FREE, 'emailsPerMonth')).toBe(100);
      expect(getUsageLimit(SubscriptionTier.STARTER, 'contacts')).toBe(5000);
      expect(getUsageLimit(SubscriptionTier.PRO, 'smtpConfigs')).toBe(10);
    });

    it('should return null for unlimited', () => {
      expect(getUsageLimit(SubscriptionTier.ENTERPRISE, 'emailsPerMonth')).toBeNull();
      expect(getUsageLimit(SubscriptionTier.ENTERPRISE, 'contacts')).toBeNull();
      expect(getUsageLimit(SubscriptionTier.PRO, 'templates')).toBeNull();
    });
  });
});

describe('Tier Upgrade/Downgrade', () => {
  describe('canUpgradeTo', () => {
    it('should allow upgrading to higher tiers', () => {
      expect(canUpgradeTo(SubscriptionTier.FREE, SubscriptionTier.STARTER)).toBe(true);
      expect(canUpgradeTo(SubscriptionTier.FREE, SubscriptionTier.PRO)).toBe(true);
      expect(canUpgradeTo(SubscriptionTier.FREE, SubscriptionTier.ENTERPRISE)).toBe(true);
      expect(canUpgradeTo(SubscriptionTier.STARTER, SubscriptionTier.PRO)).toBe(true);
      expect(canUpgradeTo(SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE)).toBe(true);
    });

    it('should not allow upgrading to same tier', () => {
      expect(canUpgradeTo(SubscriptionTier.PRO, SubscriptionTier.PRO)).toBe(false);
    });

    it('should not allow upgrading to lower tier', () => {
      expect(canUpgradeTo(SubscriptionTier.PRO, SubscriptionTier.STARTER)).toBe(false);
      expect(canUpgradeTo(SubscriptionTier.ENTERPRISE, SubscriptionTier.FREE)).toBe(false);
    });
  });

  describe('canDowngradeTo', () => {
    it('should allow downgrading to lower tiers', () => {
      expect(canDowngradeTo(SubscriptionTier.ENTERPRISE, SubscriptionTier.PRO)).toBe(true);
      expect(canDowngradeTo(SubscriptionTier.PRO, SubscriptionTier.STARTER)).toBe(true);
      expect(canDowngradeTo(SubscriptionTier.STARTER, SubscriptionTier.FREE)).toBe(true);
    });

    it('should not allow downgrading to same tier', () => {
      expect(canDowngradeTo(SubscriptionTier.PRO, SubscriptionTier.PRO)).toBe(false);
    });

    it('should not allow downgrading to higher tier', () => {
      expect(canDowngradeTo(SubscriptionTier.FREE, SubscriptionTier.STARTER)).toBe(false);
    });
  });

  describe('getPaidTiers', () => {
    it('should return only paid tiers', () => {
      const paidTiers = getPaidTiers();
      expect(paidTiers).toHaveLength(3);
      expect(paidTiers).toContain(SubscriptionTier.STARTER);
      expect(paidTiers).toContain(SubscriptionTier.PRO);
      expect(paidTiers).toContain(SubscriptionTier.ENTERPRISE);
      expect(paidTiers).not.toContain(SubscriptionTier.FREE);
    });
  });

  describe('isPaidTier', () => {
    it('should return false for FREE tier', () => {
      expect(isPaidTier(SubscriptionTier.FREE)).toBe(false);
    });

    it('should return true for paid tiers', () => {
      expect(isPaidTier(SubscriptionTier.STARTER)).toBe(true);
      expect(isPaidTier(SubscriptionTier.PRO)).toBe(true);
      expect(isPaidTier(SubscriptionTier.ENTERPRISE)).toBe(true);
    });
  });
});

describe('Price Formatting', () => {
  describe('formatPrice', () => {
    it('should format price in USD', () => {
      expect(formatPrice(499)).toBe('$4.99');
      expect(formatPrice(1499)).toBe('$14.99');
      expect(formatPrice(4999)).toBe('$49.99');
    });

    it('should format zero price', () => {
      expect(formatPrice(0)).toBe('$0');
    });

    it('should format whole dollar amounts without decimals', () => {
      expect(formatPrice(500)).toBe('$5');
      expect(formatPrice(1000)).toBe('$10');
    });
  });

  describe('calculateYearlySavings', () => {
    it('should calculate yearly savings correctly', () => {
      // STARTER: 499 * 12 = 5988, yearly = 4990, savings = 998
      expect(calculateYearlySavings(SubscriptionTier.STARTER)).toBe(998);

      // PRO: 1499 * 12 = 17988, yearly = 14990, savings = 2998
      expect(calculateYearlySavings(SubscriptionTier.PRO)).toBe(2998);
    });

    it('should return 0 for FREE tier', () => {
      expect(calculateYearlySavings(SubscriptionTier.FREE)).toBe(0);
    });
  });

  describe('calculateYearlySavingsPercentage', () => {
    it('should calculate savings percentage correctly', () => {
      // Approximately 17% savings (2 months free)
      expect(calculateYearlySavingsPercentage(SubscriptionTier.STARTER)).toBeGreaterThan(15);
      expect(calculateYearlySavingsPercentage(SubscriptionTier.STARTER)).toBeLessThan(20);
    });

    it('should return 0 for FREE tier', () => {
      expect(calculateYearlySavingsPercentage(SubscriptionTier.FREE)).toBe(0);
    });
  });
});

describe('Region-Based Gateway Selection', () => {
  describe('Country Lists', () => {
    it('should have Egypt in EGYPT_COUNTRIES', () => {
      expect(EGYPT_COUNTRIES).toContain('EG');
    });

    it('should have Gulf countries in MENA_COUNTRIES', () => {
      expect(MENA_COUNTRIES).toContain('SA');
      expect(MENA_COUNTRIES).toContain('AE');
      expect(MENA_COUNTRIES).toContain('KW');
    });

    it('should have EU countries in EU_COUNTRIES', () => {
      expect(EU_COUNTRIES).toContain('DE');
      expect(EU_COUNTRIES).toContain('FR');
      expect(EU_COUNTRIES).toContain('IT');
    });
  });

  describe('getProviderForCountry', () => {
    it('should return PAYMOB for Egypt', () => {
      expect(getProviderForCountry('EG')).toBe(PaymentProvider.PAYMOB);
      expect(getProviderForCountry('eg')).toBe(PaymentProvider.PAYMOB);
    });

    it('should return PAYTABS for MENA countries', () => {
      expect(getProviderForCountry('SA')).toBe(PaymentProvider.PAYTABS);
      expect(getProviderForCountry('AE')).toBe(PaymentProvider.PAYTABS);
      expect(getProviderForCountry('KW')).toBe(PaymentProvider.PAYTABS);
    });

    it('should return PADDLE for EU countries', () => {
      expect(getProviderForCountry('DE')).toBe(PaymentProvider.PADDLE);
      expect(getProviderForCountry('FR')).toBe(PaymentProvider.PADDLE);
      expect(getProviderForCountry('IT')).toBe(PaymentProvider.PADDLE);
    });

    it('should return STRIPE for other countries', () => {
      expect(getProviderForCountry('US')).toBe(PaymentProvider.STRIPE);
      expect(getProviderForCountry('GB')).toBe(PaymentProvider.STRIPE);
      expect(getProviderForCountry('CA')).toBe(PaymentProvider.STRIPE);
    });

    it('should return STRIPE when no country is provided', () => {
      expect(getProviderForCountry()).toBe(PaymentProvider.STRIPE);
      expect(getProviderForCountry(undefined)).toBe(PaymentProvider.STRIPE);
    });
  });

  describe('getCountriesForProvider', () => {
    it('should return Egypt countries for PAYMOB', () => {
      expect(getCountriesForProvider(PaymentProvider.PAYMOB)).toEqual(EGYPT_COUNTRIES);
    });

    it('should return MENA countries for PAYTABS', () => {
      expect(getCountriesForProvider(PaymentProvider.PAYTABS)).toEqual(MENA_COUNTRIES);
    });

    it('should return EU countries for PADDLE', () => {
      expect(getCountriesForProvider(PaymentProvider.PADDLE)).toEqual(EU_COUNTRIES);
    });

    it('should return empty array for STRIPE (fallback)', () => {
      expect(getCountriesForProvider(PaymentProvider.STRIPE)).toEqual([]);
    });
  });
});

describe('Webhook Event Types', () => {
  it('should have subscription events', () => {
    expect(PAYMENT_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED).toBe('subscription.created');
    expect(PAYMENT_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED).toBe('subscription.updated');
    expect(PAYMENT_WEBHOOK_EVENTS.SUBSCRIPTION_CANCELED).toBe('subscription.canceled');
  });

  it('should have payment events', () => {
    expect(PAYMENT_WEBHOOK_EVENTS.PAYMENT_SUCCEEDED).toBe('payment.succeeded');
    expect(PAYMENT_WEBHOOK_EVENTS.PAYMENT_FAILED).toBe('payment.failed');
    expect(PAYMENT_WEBHOOK_EVENTS.PAYMENT_REFUNDED).toBe('payment.refunded');
  });

  it('should have invoice events', () => {
    expect(PAYMENT_WEBHOOK_EVENTS.INVOICE_CREATED).toBe('invoice.created');
    expect(PAYMENT_WEBHOOK_EVENTS.INVOICE_PAID).toBe('invoice.paid');
    expect(PAYMENT_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED).toBe('invoice.payment_failed');
  });
});
