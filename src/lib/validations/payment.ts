/**
 * Payment Validation Schemas
 * Zod schemas for payment-related API operations
 */

import { z } from 'zod';

// ===========================================
// ENUMS FOR VALIDATION
// ===========================================

export const subscriptionTierSchema = z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']);
export const subscriptionStatusSchema = z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING', 'PAUSED', 'UNPAID']);
export const paymentProviderSchema = z.enum(['STRIPE', 'PAYMOB', 'PAYTABS', 'PADDLE']);
export const paymentStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']);
export const paymentMethodTypeSchema = z.enum(['CARD', 'WALLET', 'BANK_ACCOUNT', 'KIOSK']);
export const invoiceStatusSchema = z.enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE']);
export const billingIntervalSchema = z.enum(['monthly', 'yearly']);

// ===========================================
// CHECKOUT SCHEMAS
// ===========================================

export const createCheckoutSessionSchema = z.object({
  tier: subscriptionTierSchema,
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
  couponCode: z.string().max(50).optional(),
  trialDays: z.number().int().min(0).max(30).optional(),
  billingInterval: billingIntervalSchema.default('monthly'),
  provider: paymentProviderSchema.optional(),
  metadata: z.record(z.string()).optional(),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

export const createPortalSessionSchema = z.object({
  returnUrl: z.string().url('Invalid return URL'),
});

export type CreatePortalSessionInput = z.infer<typeof createPortalSessionSchema>;

// ===========================================
// SUBSCRIPTION SCHEMAS
// ===========================================

export const getSubscriptionSchema = z.object({
  userId: z.string().cuid().optional(),
});

export type GetSubscriptionInput = z.infer<typeof getSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  tier: subscriptionTierSchema,
  billingInterval: billingIntervalSchema.optional(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

export const resumeSubscriptionSchema = z.object({});

export type ResumeSubscriptionInput = z.infer<typeof resumeSubscriptionSchema>;

// ===========================================
// PAYMENT SCHEMAS
// ===========================================

export const listPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: paymentStatusSchema.optional(),
  provider: paymentProviderSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;

export const getPaymentSchema = z.object({
  id: z.string().cuid(),
});

export type GetPaymentInput = z.infer<typeof getPaymentSchema>;

export const refundPaymentSchema = z.object({
  amount: z.number().int().min(1).optional(), // Partial refund amount in cents
  reason: z.string().max(500).optional(),
});

export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

// ===========================================
// PAYMENT METHOD SCHEMAS
// ===========================================

export const listPaymentMethodsSchema = z.object({
  provider: paymentProviderSchema.optional(),
});

export type ListPaymentMethodsInput = z.infer<typeof listPaymentMethodsSchema>;

export const deletePaymentMethodSchema = z.object({
  id: z.string().cuid(),
});

export type DeletePaymentMethodInput = z.infer<typeof deletePaymentMethodSchema>;

export const setDefaultPaymentMethodSchema = z.object({
  id: z.string().cuid(),
});

export type SetDefaultPaymentMethodInput = z.infer<typeof setDefaultPaymentMethodSchema>;

// ===========================================
// INVOICE SCHEMAS
// ===========================================

export const listInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: invoiceStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;

export const getInvoiceSchema = z.object({
  id: z.string().cuid(),
});

export type GetInvoiceInput = z.infer<typeof getInvoiceSchema>;

// ===========================================
// COUPON SCHEMAS
// ===========================================

export const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  tier: subscriptionTierSchema,
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
});

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

// ===========================================
// WEBHOOK SCHEMAS
// ===========================================

export const stripeWebhookSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
  created: z.number(),
  livemode: z.boolean(),
});

export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>;

export const paymobWebhookSchema = z.object({
  obj: z.object({
    id: z.number(),
    pending: z.boolean(),
    success: z.boolean(),
    amount_cents: z.number(),
    currency: z.string(),
    order: z.object({
      id: z.number(),
    }),
    source_data: z.object({
      type: z.string(),
      sub_type: z.string().optional(),
    }),
  }),
  type: z.string(),
  hmac: z.string().optional(),
});

export type PaymobWebhookInput = z.infer<typeof paymobWebhookSchema>;

export const paytabsWebhookSchema = z.object({
  tran_ref: z.string(),
  cart_id: z.string(),
  cart_amount: z.number(),
  cart_currency: z.string(),
  tran_type: z.string(),
  payment_result: z.object({
    response_status: z.string(),
    response_code: z.string(),
    response_message: z.string(),
  }),
  customer_details: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }).optional(),
});

export type PaytabsWebhookInput = z.infer<typeof paytabsWebhookSchema>;

export const paddleWebhookSchema = z.object({
  event_type: z.string(),
  event_id: z.string(),
  occurred_at: z.string(),
  data: z.record(z.unknown()),
});

export type PaddleWebhookInput = z.infer<typeof paddleWebhookSchema>;

// ===========================================
// USAGE SCHEMAS
// ===========================================

export const getUsageSchema = z.object({
  userId: z.string().cuid().optional(),
});

export type GetUsageInput = z.infer<typeof getUsageSchema>;

export const checkUsageLimitSchema = z.object({
  feature: z.enum(['emailsPerMonth', 'contacts', 'smtpConfigs', 'templates']),
  increment: z.number().int().min(1).default(1),
});

export type CheckUsageLimitInput = z.infer<typeof checkUsageLimitSchema>;

// ===========================================
// ADMIN SCHEMAS
// ===========================================

export const adminListSubscriptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tier: subscriptionTierSchema.optional(),
  status: subscriptionStatusSchema.optional(),
  provider: paymentProviderSchema.optional(),
  search: z.string().max(100).optional(),
});

export type AdminListSubscriptionsInput = z.infer<typeof adminListSubscriptionsSchema>;

export const adminUpdateSubscriptionSchema = z.object({
  tier: subscriptionTierSchema.optional(),
  status: subscriptionStatusSchema.optional(),
  emailLimit: z.number().int().min(0).nullable().optional(),
  contactLimit: z.number().int().min(0).nullable().optional(),
});

export type AdminUpdateSubscriptionInput = z.infer<typeof adminUpdateSubscriptionSchema>;

export const adminCreateCouponSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric with dashes/underscores'),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number().int().min(1),
  currency: z.string().length(3).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  maxRedemptionsPerUser: z.number().int().min(1).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  applicableTiers: z.array(subscriptionTierSchema).optional(),
  minimumAmount: z.number().int().min(0).optional(),
  firstTimeOnly: z.boolean().default(false),
});

export type AdminCreateCouponInput = z.infer<typeof adminCreateCouponSchema>;

export const adminUpdateCouponSchema = z.object({
  active: z.boolean().optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  validUntil: z.string().datetime().nullable().optional(),
});

export type AdminUpdateCouponInput = z.infer<typeof adminUpdateCouponSchema>;
