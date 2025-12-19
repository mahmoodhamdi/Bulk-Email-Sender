/**
 * Payment System Types
 * Core types, enums, and tier configuration for the payment gateway system
 */

// ===========================================
// ENUMS (mirror Prisma enums for TypeScript)
// ===========================================

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYMOB = 'PAYMOB',
  PAYTABS = 'PAYTABS',
  PADDLE = 'PADDLE',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
  PAUSED = 'PAUSED',
  UNPAID = 'UNPAID',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentMethodType {
  CARD = 'CARD',
  WALLET = 'WALLET',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  KIOSK = 'KIOSK',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

// ===========================================
// INTERFACES
// ===========================================

export interface CheckoutParams {
  userId: string;
  userEmail: string;
  userName?: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string;
  trialDays?: number;
  billingInterval?: 'monthly' | 'yearly';
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
  provider: PaymentProvider;
  expiresAt?: Date;
}

export interface CustomerPortalParams {
  userId: string;
  returnUrl: string;
}

export interface CustomerPortalResult {
  url: string;
  provider: PaymentProvider;
}

export interface WebhookResult {
  received: boolean;
  eventType: string;
  processed: boolean;
  subscriptionId?: string;
  paymentId?: string;
  error?: string;
}

export interface SubscriptionInfo {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
}

export interface PaymentInfo {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId?: string;
  description?: string;
  receiptUrl?: string;
  createdAt: Date;
}

export interface PaymentMethodInfo {
  id: string;
  userId: string;
  provider: PaymentProvider;
  type: PaymentMethodType;
  isDefault: boolean;
  // Card details
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  // Wallet details
  walletType?: string;
  walletPhone?: string;
}

export interface RefundParams {
  paymentId: string;
  amount?: number; // Partial refund if provided, full refund otherwise
  reason?: string;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  provider: PaymentProvider;
}

export interface UsageInfo {
  emailsSentThisMonth: number;
  emailLimit: number | null;
  contactsCount: number;
  contactLimit: number | null;
  usageResetAt: Date | null;
  emailsRemaining: number | null;
  contactsRemaining: number | null;
  percentageUsed: {
    emails: number;
    contacts: number;
  };
}

// ===========================================
// PAYMENT GATEWAY INTERFACE
// ===========================================

export interface PaymentGateway {
  readonly provider: PaymentProvider;

  // Checkout & Subscriptions
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  createCustomerPortalSession(params: CustomerPortalParams): Promise<CustomerPortalResult>;
  getSubscription(providerSubscriptionId: string): Promise<SubscriptionInfo | null>;
  cancelSubscription(providerSubscriptionId: string, immediately?: boolean): Promise<void>;
  resumeSubscription(providerSubscriptionId: string): Promise<void>;
  updateSubscription(providerSubscriptionId: string, newTier: SubscriptionTier): Promise<SubscriptionInfo>;

  // Payments
  getPayment(providerPaymentId: string): Promise<PaymentInfo | null>;
  refundPayment(params: RefundParams): Promise<RefundResult>;

  // Payment Methods
  listPaymentMethods(providerCustomerId: string): Promise<PaymentMethodInfo[]>;
  deletePaymentMethod(providerMethodId: string): Promise<void>;
  setDefaultPaymentMethod(providerCustomerId: string, providerMethodId: string): Promise<void>;

  // Webhooks
  constructWebhookEvent(payload: string | Buffer, signature: string): Promise<unknown>;
  handleWebhookEvent(event: unknown): Promise<WebhookResult>;

  // Customer Management
  getCustomerId(userId: string): Promise<string | null>;
  createCustomer(userId: string, email: string, name?: string): Promise<string>;
  deleteCustomer(providerCustomerId: string): Promise<void>;
}

// ===========================================
// TIER CONFIGURATION
// ===========================================

export interface TierConfig {
  name: string;
  description: string;
  monthlyPrice: number; // In cents
  yearlyPrice: number; // In cents (discounted)
  currency: string;
  features: string[];
  limits: TierLimits;
  // Provider-specific price IDs (set via environment variables)
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  paddleProductIdMonthly?: string;
  paddleProductIdYearly?: string;
  paymobPlanId?: string;
  paytabsPlanId?: string;
}

export interface TierLimits {
  emailsPerMonth: number | null; // null = unlimited
  contacts: number | null; // null = unlimited
  smtpConfigs: number;
  templates: number | null; // null = unlimited
  abTesting: boolean;
  automation: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  customIntegrations: boolean;
}

/**
 * Tier configuration with pricing and limits
 * Prices are in cents (USD)
 */
export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  [SubscriptionTier.FREE]: {
    name: 'Free',
    description: 'Get started with basic email sending',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
    features: [
      'Up to 100 emails/month',
      'Up to 500 contacts',
      '1 SMTP configuration',
      'Basic templates',
      'Email tracking',
    ],
    limits: {
      emailsPerMonth: 100,
      contacts: 500,
      smtpConfigs: 1,
      templates: 5,
      abTesting: false,
      automation: false,
      apiAccess: false,
      webhooks: false,
      customBranding: false,
      prioritySupport: false,
      dedicatedSupport: false,
      customIntegrations: false,
    },
  },
  [SubscriptionTier.STARTER]: {
    name: 'Starter',
    description: 'For growing businesses',
    monthlyPrice: 499, // $4.99
    yearlyPrice: 4990, // $49.90 (2 months free)
    currency: 'USD',
    features: [
      'Up to 5,000 emails/month',
      'Up to 5,000 contacts',
      '3 SMTP configurations',
      'All templates',
      'Email analytics',
      'CSV import/export',
    ],
    limits: {
      emailsPerMonth: 5000,
      contacts: 5000,
      smtpConfigs: 3,
      templates: null, // Unlimited
      abTesting: false,
      automation: false,
      apiAccess: false,
      webhooks: true,
      customBranding: false,
      prioritySupport: false,
      dedicatedSupport: false,
      customIntegrations: false,
    },
  },
  [SubscriptionTier.PRO]: {
    name: 'Pro',
    description: 'For professional marketers',
    monthlyPrice: 1499, // $14.99
    yearlyPrice: 14990, // $149.90 (2 months free)
    currency: 'USD',
    features: [
      'Up to 50,000 emails/month',
      'Up to 50,000 contacts',
      '10 SMTP configurations',
      'A/B testing',
      'Automation workflows',
      'API access',
      'Advanced analytics',
      'Priority support',
    ],
    limits: {
      emailsPerMonth: 50000,
      contacts: 50000,
      smtpConfigs: 10,
      templates: null,
      abTesting: true,
      automation: true,
      apiAccess: true,
      webhooks: true,
      customBranding: true,
      prioritySupport: true,
      dedicatedSupport: false,
      customIntegrations: false,
    },
  },
  [SubscriptionTier.ENTERPRISE]: {
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 4999, // $49.99
    yearlyPrice: 49990, // $499.90 (2 months free)
    currency: 'USD',
    features: [
      'Unlimited emails',
      'Unlimited contacts',
      'Unlimited SMTP configurations',
      'All Pro features',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Custom contracts',
    ],
    limits: {
      emailsPerMonth: null, // Unlimited
      contacts: null, // Unlimited
      smtpConfigs: 100,
      templates: null,
      abTesting: true,
      automation: true,
      apiAccess: true,
      webhooks: true,
      customBranding: true,
      prioritySupport: true,
      dedicatedSupport: true,
      customIntegrations: true,
    },
  },
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get tier configuration
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIG[tier];
}

/**
 * Get tier limits
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIG[tier].limits;
}

/**
 * Check if a feature is available for a tier
 */
export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof TierLimits
): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];

  if (typeof value === 'boolean') return value;
  if (value === null) return true; // Unlimited
  return value > 0;
}

/**
 * Get the usage limit for a specific limit type
 */
export function getUsageLimit(
  tier: SubscriptionTier,
  limitKey: 'emailsPerMonth' | 'contacts' | 'smtpConfigs' | 'templates'
): number | null {
  const limits = getTierLimits(tier);
  return limits[limitKey];
}

/**
 * Check if user can upgrade to a tier
 */
export function canUpgradeTo(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
  const tierOrder = [
    SubscriptionTier.FREE,
    SubscriptionTier.STARTER,
    SubscriptionTier.PRO,
    SubscriptionTier.ENTERPRISE,
  ];

  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);

  return targetIndex > currentIndex;
}

/**
 * Check if user can downgrade to a tier
 */
export function canDowngradeTo(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
  const tierOrder = [
    SubscriptionTier.FREE,
    SubscriptionTier.STARTER,
    SubscriptionTier.PRO,
    SubscriptionTier.ENTERPRISE,
  ];

  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);

  return targetIndex < currentIndex;
}

/**
 * Get all paid tiers
 */
export function getPaidTiers(): SubscriptionTier[] {
  return [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE];
}

/**
 * Check if tier is a paid tier
 */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier !== SubscriptionTier.FREE;
}

/**
 * Format price for display
 */
export function formatPrice(priceInCents: number, currency: string = 'USD'): string {
  const price = priceInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(tier: SubscriptionTier): number {
  const config = getTierConfig(tier);
  const monthlyTotal = config.monthlyPrice * 12;
  return monthlyTotal - config.yearlyPrice;
}

/**
 * Calculate yearly savings percentage
 */
export function calculateYearlySavingsPercentage(tier: SubscriptionTier): number {
  const config = getTierConfig(tier);
  if (config.monthlyPrice === 0) return 0;
  const monthlyTotal = config.monthlyPrice * 12;
  return Math.round(((monthlyTotal - config.yearlyPrice) / monthlyTotal) * 100);
}

// ===========================================
// REGION-BASED GATEWAY SELECTION
// ===========================================

/**
 * Country codes for Egyptian market (Paymob)
 */
export const EGYPT_COUNTRIES = ['EG'];

/**
 * Country codes for MENA region (PayTabs)
 */
export const MENA_COUNTRIES = ['SA', 'AE', 'KW', 'BH', 'OM', 'QA', 'JO', 'LB'];

/**
 * Country codes for EU (Paddle for MoR tax handling)
 */
export const EU_COUNTRIES = [
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'SE', 'DK', 'FI', 'IE', 'PT',
  'GR', 'CZ', 'RO', 'HU', 'SK', 'BG', 'HR', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY',
];

/**
 * Get the recommended payment provider for a country
 */
export function getProviderForCountry(countryCode?: string): PaymentProvider {
  if (!countryCode) {
    return PaymentProvider.STRIPE; // Default
  }

  const upperCode = countryCode.toUpperCase();

  // Egyptian market → Paymob
  if (EGYPT_COUNTRIES.includes(upperCode)) {
    return PaymentProvider.PAYMOB;
  }

  // MENA region → PayTabs
  if (MENA_COUNTRIES.includes(upperCode)) {
    return PaymentProvider.PAYTABS;
  }

  // EU countries → Paddle (MoR handles tax)
  if (EU_COUNTRIES.includes(upperCode)) {
    return PaymentProvider.PADDLE;
  }

  // Default → Stripe
  return PaymentProvider.STRIPE;
}

/**
 * Get all supported countries for a provider
 */
export function getCountriesForProvider(provider: PaymentProvider): string[] {
  switch (provider) {
    case PaymentProvider.PAYMOB:
      return EGYPT_COUNTRIES;
    case PaymentProvider.PAYTABS:
      return MENA_COUNTRIES;
    case PaymentProvider.PADDLE:
      return EU_COUNTRIES;
    case PaymentProvider.STRIPE:
    default:
      return []; // Stripe is the fallback for all other countries
  }
}

// ===========================================
// WEBHOOK EVENT TYPES
// ===========================================

export const PAYMENT_WEBHOOK_EVENTS = {
  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_TRIAL_ENDING: 'subscription.trial_ending',
  SUBSCRIPTION_PAST_DUE: 'subscription.past_due',

  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',

  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
} as const;

export type PaymentWebhookEventType = typeof PAYMENT_WEBHOOK_EVENTS[keyof typeof PAYMENT_WEBHOOK_EVENTS];
