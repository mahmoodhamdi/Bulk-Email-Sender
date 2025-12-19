/**
 * Paddle API Client Configuration
 * Handles authentication and HTTP requests to Paddle API (Billing v2)
 */

import { createHmac } from 'crypto';

// Paddle API base URLs
const PADDLE_API_URLS = {
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
};

// Environment variable getters
export function getPaddleApiKey(): string {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error('PADDLE_API_KEY environment variable is required');
  }
  return apiKey;
}

export function getPaddleWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('PADDLE_WEBHOOK_SECRET environment variable is required');
  }
  return secret;
}

export function getPaddleClientToken(): string {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '';
}

export function getPaddleEnvironment(): 'sandbox' | 'production' {
  return (process.env.PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
}

export function getPaddleApiUrl(): string {
  return PADDLE_API_URLS[getPaddleEnvironment()];
}

export function isPaddleConfigured(): boolean {
  return !!(process.env.PADDLE_API_KEY);
}

/**
 * Make authenticated request to Paddle API
 */
export async function paddleRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const baseUrl = getPaddleApiUrl();
  const apiKey = getPaddleApiKey();

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Paddle API error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

// ===========================================
// PRODUCTS & PRICES
// ===========================================

export interface PaddlePrice {
  id: string;
  product_id: string;
  description: string;
  unit_price: {
    amount: string;
    currency_code: string;
  };
  billing_cycle: {
    frequency: number;
    interval: 'month' | 'year';
  } | null;
  trial_period: {
    frequency: number;
    interval: 'day' | 'week' | 'month';
  } | null;
  status: 'active' | 'archived';
  custom_data: Record<string, string> | null;
}

export async function getPrice(priceId: string): Promise<PaddlePrice> {
  const result = await paddleRequest<PaddlePrice>(`/prices/${priceId}`);
  return result.data;
}

export async function listPrices(productId?: string): Promise<PaddlePrice[]> {
  let endpoint = '/prices';
  if (productId) {
    endpoint += `?product_id=${productId}`;
  }
  const result = await paddleRequest<PaddlePrice[]>(endpoint);
  return result.data;
}

// ===========================================
// CUSTOMERS
// ===========================================

export interface PaddleCustomer {
  id: string;
  name: string | null;
  email: string;
  marketing_consent: boolean;
  status: 'active' | 'archived';
  custom_data: Record<string, string> | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export async function createCustomer(
  email: string,
  name?: string,
  customData?: Record<string, string>
): Promise<PaddleCustomer> {
  const result = await paddleRequest<PaddleCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      email,
      name,
      custom_data: customData,
    }),
  });
  return result.data;
}

export async function getCustomer(customerId: string): Promise<PaddleCustomer> {
  const result = await paddleRequest<PaddleCustomer>(`/customers/${customerId}`);
  return result.data;
}

export async function listCustomers(email?: string): Promise<PaddleCustomer[]> {
  let endpoint = '/customers';
  if (email) {
    endpoint += `?email=${encodeURIComponent(email)}`;
  }
  const result = await paddleRequest<PaddleCustomer[]>(endpoint);
  return result.data;
}

export async function updateCustomer(
  customerId: string,
  updates: { name?: string; email?: string; custom_data?: Record<string, string> }
): Promise<PaddleCustomer> {
  const result = await paddleRequest<PaddleCustomer>(`/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return result.data;
}

// ===========================================
// SUBSCRIPTIONS
// ===========================================

export interface PaddleSubscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing';
  customer_id: string;
  address_id: string | null;
  business_id: string | null;
  currency_code: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  first_billed_at: string | null;
  next_billed_at: string | null;
  paused_at: string | null;
  canceled_at: string | null;
  collection_mode: 'automatic' | 'manual';
  billing_details: {
    enable_checkout: boolean;
    payment_terms: {
      interval: string;
      frequency: number;
    };
    purchase_order_number: string | null;
  } | null;
  current_billing_period: {
    starts_at: string;
    ends_at: string;
  } | null;
  billing_cycle: {
    frequency: number;
    interval: 'month' | 'year';
  };
  scheduled_change: {
    action: 'cancel' | 'pause' | 'resume';
    effective_at: string;
    resume_at: string | null;
  } | null;
  items: Array<{
    status: 'active' | 'inactive' | 'trialing';
    quantity: number;
    recurring: boolean;
    created_at: string;
    updated_at: string;
    previously_billed_at: string | null;
    next_billed_at: string | null;
    trial_dates: {
      starts_at: string;
      ends_at: string;
    } | null;
    price: PaddlePrice;
    product: {
      id: string;
      name: string;
      description: string | null;
      type: 'standard' | 'custom';
      tax_category: string;
      image_url: string | null;
      custom_data: Record<string, string> | null;
      status: 'active' | 'archived';
    };
  }>;
  custom_data: Record<string, string> | null;
  management_urls: {
    update_payment_method: string | null;
    cancel: string | null;
  };
  discount: {
    id: string;
    starts_at: string;
    ends_at: string | null;
  } | null;
}

export async function getSubscription(subscriptionId: string): Promise<PaddleSubscription> {
  const result = await paddleRequest<PaddleSubscription>(`/subscriptions/${subscriptionId}`);
  return result.data;
}

export async function listSubscriptions(customerId?: string): Promise<PaddleSubscription[]> {
  let endpoint = '/subscriptions';
  if (customerId) {
    endpoint += `?customer_id=${customerId}`;
  }
  const result = await paddleRequest<PaddleSubscription[]>(endpoint);
  return result.data;
}

export async function updateSubscription(
  subscriptionId: string,
  updates: {
    proration_billing_mode?: 'prorated_immediately' | 'prorated_next_billing_period' | 'full_immediately' | 'full_next_billing_period' | 'do_not_bill';
    items?: Array<{ price_id: string; quantity?: number }>;
    scheduled_change?: null; // Set to null to remove scheduled change
    billing_details?: {
      enable_checkout?: boolean;
      purchase_order_number?: string;
      payment_terms?: {
        interval: string;
        frequency: number;
      };
    };
    custom_data?: Record<string, string>;
  }
): Promise<PaddleSubscription> {
  const result = await paddleRequest<PaddleSubscription>(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return result.data;
}

export async function cancelSubscription(
  subscriptionId: string,
  effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'
): Promise<PaddleSubscription> {
  const result = await paddleRequest<PaddleSubscription>(`/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ effective_from: effectiveFrom }),
  });
  return result.data;
}

export async function pauseSubscription(
  subscriptionId: string,
  effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period',
  resumeAt?: string
): Promise<PaddleSubscription> {
  const result = await paddleRequest<PaddleSubscription>(`/subscriptions/${subscriptionId}/pause`, {
    method: 'POST',
    body: JSON.stringify({
      effective_from: effectiveFrom,
      resume_at: resumeAt,
    }),
  });
  return result.data;
}

export async function resumeSubscription(
  subscriptionId: string,
  effectiveFrom: 'immediately' | 'next_billing_period' = 'immediately'
): Promise<PaddleSubscription> {
  const result = await paddleRequest<PaddleSubscription>(`/subscriptions/${subscriptionId}/resume`, {
    method: 'POST',
    body: JSON.stringify({ effective_from: effectiveFrom }),
  });
  return result.data;
}

// ===========================================
// TRANSACTIONS
// ===========================================

export interface PaddleTransaction {
  id: string;
  status: 'draft' | 'ready' | 'billed' | 'paid' | 'completed' | 'canceled' | 'past_due';
  customer_id: string | null;
  address_id: string | null;
  business_id: string | null;
  custom_data: Record<string, string> | null;
  origin: 'api' | 'subscription_charge' | 'subscription_payment_method_change' | 'subscription_recurring' | 'subscription_update' | 'web';
  subscription_id: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  collection_mode: 'automatic' | 'manual';
  discount_id: string | null;
  billing_details: {
    enable_checkout: boolean;
    payment_terms: {
      interval: string;
      frequency: number;
    };
    purchase_order_number: string | null;
  } | null;
  billing_period: {
    starts_at: string;
    ends_at: string;
  } | null;
  items: Array<{
    price_id: string;
    quantity: number;
    proration: {
      rate: string;
      billing_period: {
        starts_at: string;
        ends_at: string;
      };
    } | null;
  }>;
  details: {
    tax_rates_used: Array<{
      tax_rate: string;
      totals: {
        subtotal: string;
        discount: string;
        tax: string;
        total: string;
      };
    }>;
    totals: {
      subtotal: string;
      discount: string;
      tax: string;
      total: string;
      credit: string;
      balance: string;
      grand_total: string;
      fee: string | null;
      earnings: string | null;
      currency_code: string;
    };
    adjusted_totals: {
      subtotal: string;
      tax: string;
      total: string;
      grand_total: string;
      fee: string | null;
      earnings: string | null;
      currency_code: string;
    } | null;
    payout_totals: {
      subtotal: string;
      discount: string;
      tax: string;
      total: string;
      credit: string;
      balance: string;
      grand_total: string;
      fee: string;
      earnings: string;
      currency_code: string;
    } | null;
    adjusted_payout_totals: {
      subtotal: string;
      tax: string;
      total: string;
      fee: string;
      chargeback_fee: {
        amount: string;
        original: {
          amount: string;
          currency_code: string;
        } | null;
      };
      earnings: string;
      currency_code: string;
    } | null;
    line_items: Array<{
      id: string;
      price_id: string;
      quantity: number;
      proration: {
        rate: string;
        billing_period: {
          starts_at: string;
          ends_at: string;
        };
      } | null;
      tax_rate: string;
      unit_totals: {
        subtotal: string;
        discount: string;
        tax: string;
        total: string;
      };
      totals: {
        subtotal: string;
        discount: string;
        tax: string;
        total: string;
      };
      product: {
        id: string;
        name: string;
        description: string | null;
        type: 'standard' | 'custom';
        tax_category: string;
        image_url: string | null;
        custom_data: Record<string, string> | null;
        status: 'active' | 'archived';
      };
    }>;
  };
  payments: Array<{
    payment_attempt_id: string;
    stored_payment_method_id: string;
    amount: string;
    status: 'authorized' | 'authorized_flagged' | 'canceled' | 'captured' | 'error' | 'action_required' | 'pending_no_action_required' | 'created' | 'unknown';
    error_code: string | null;
    method_details: {
      type: 'alipay' | 'apple_pay' | 'bancontact' | 'card' | 'google_pay' | 'ideal' | 'paypal' | 'unknown' | 'wire_transfer';
      card: {
        type: 'credit' | 'debit' | 'prepaid' | 'unknown';
        last4: string;
        expiry_month: number;
        expiry_year: number;
        cardholder_name: string;
      } | null;
    };
    created_at: string;
    captured_at: string | null;
  }>;
  checkout: {
    url: string | null;
  } | null;
  created_at: string;
  updated_at: string;
  billed_at: string | null;
  currency_code: string;
  receipt_data: string | null;
}

export async function getTransaction(transactionId: string): Promise<PaddleTransaction> {
  const result = await paddleRequest<PaddleTransaction>(`/transactions/${transactionId}`);
  return result.data;
}

export async function createTransaction(params: {
  items: Array<{ price_id: string; quantity?: number }>;
  customer_id?: string;
  address_id?: string;
  discount_id?: string;
  custom_data?: Record<string, string>;
  billing_details?: {
    enable_checkout?: boolean;
    purchase_order_number?: string;
    payment_terms?: {
      interval: string;
      frequency: number;
    };
  };
  currency_code?: string;
  collection_mode?: 'automatic' | 'manual';
  checkout?: {
    url?: string;
  };
}): Promise<PaddleTransaction> {
  const result = await paddleRequest<PaddleTransaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return result.data;
}

// ===========================================
// ADJUSTMENTS (Refunds)
// ===========================================

export interface PaddleAdjustment {
  id: string;
  action: 'credit' | 'refund' | 'chargeback' | 'chargeback_warning' | 'chargeback_reverse';
  transaction_id: string;
  subscription_id: string | null;
  customer_id: string;
  reason: string;
  credit_applied_to_balance: boolean;
  currency_code: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'reversed';
  items: Array<{
    item_id: string;
    type: 'full' | 'partial' | 'tax' | 'proration';
    amount: string | null;
    proration: {
      rate: string;
      billing_period: {
        starts_at: string;
        ends_at: string;
      };
    } | null;
    totals: {
      subtotal: string;
      tax: string;
      total: string;
    };
  }>;
  totals: {
    subtotal: string;
    tax: string;
    total: string;
    fee: string;
    earnings: string;
    currency_code: string;
  };
  payout_totals: {
    subtotal: string;
    tax: string;
    total: string;
    fee: string;
    chargeback_fee: {
      amount: string;
      original: {
        amount: string;
        currency_code: string;
      } | null;
    };
    earnings: string;
    currency_code: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export async function createAdjustment(params: {
  action: 'refund' | 'credit';
  items: Array<{
    item_id: string;
    type: 'full' | 'partial';
    amount?: string;
  }>;
  reason: string;
  transaction_id: string;
}): Promise<PaddleAdjustment> {
  const result = await paddleRequest<PaddleAdjustment>('/adjustments', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return result.data;
}

// ===========================================
// WEBHOOK VERIFICATION
// ===========================================

export function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const webhookSecret = getPaddleWebhookSecret();

  // Paddle uses ts=timestamp;h1=signature format
  const signedPayload = `${timestamp}:${body}`;
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  return signature === expectedSignature;
}

export function parseWebhookSignature(headerValue: string): { ts: string; h1: string } | null {
  const parts = headerValue.split(';');
  const result: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      result[key] = value;
    }
  }

  if (result.ts && result.h1) {
    return { ts: result.ts, h1: result.h1 };
  }

  return null;
}

// ===========================================
// PADDLE PRICE IDS (configured via env)
// ===========================================

export function getPaddlePriceIds(): Record<string, { monthly: string; yearly: string }> {
  return {
    starter: {
      monthly: process.env.PADDLE_PRICE_STARTER_MONTHLY || '',
      yearly: process.env.PADDLE_PRICE_STARTER_YEARLY || '',
    },
    pro: {
      monthly: process.env.PADDLE_PRICE_PRO_MONTHLY || '',
      yearly: process.env.PADDLE_PRICE_PRO_YEARLY || '',
    },
    enterprise: {
      monthly: process.env.PADDLE_PRICE_ENTERPRISE_MONTHLY || '',
      yearly: process.env.PADDLE_PRICE_ENTERPRISE_YEARLY || '',
    },
  };
}
