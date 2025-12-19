/**
 * Paymob API Client Configuration
 * Handles authentication and HTTP requests to Paymob API
 */

import { createHmac } from 'crypto';

// Paymob API base URL
const PAYMOB_API_URL = 'https://accept.paymob.com/api';

// Environment variable getters
export function getPaymobApiKey(): string {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) {
    throw new Error('PAYMOB_API_KEY environment variable is required');
  }
  return apiKey;
}

export function getPaymobHmacSecret(): string {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) {
    throw new Error('PAYMOB_HMAC_SECRET environment variable is required');
  }
  return secret;
}

export function getPaymobIntegrationIds(): {
  card: string;
  wallet: string;
  kiosk: string;
} {
  return {
    card: process.env.PAYMOB_INTEGRATION_ID_CARD || '',
    wallet: process.env.PAYMOB_INTEGRATION_ID_WALLET || '',
    kiosk: process.env.PAYMOB_INTEGRATION_ID_KIOSK || '',
  };
}

export function isPaymobConfigured(): boolean {
  return !!(
    process.env.PAYMOB_API_KEY &&
    process.env.PAYMOB_HMAC_SECRET &&
    process.env.PAYMOB_INTEGRATION_ID_CARD
  );
}

// Token cache for authentication
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get authentication token from Paymob API
 * Tokens are cached and reused until expired
 */
export async function getAuthToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiresAt > Date.now()) {
    return cachedToken;
  }

  const apiKey = getPaymobApiKey();

  const response = await fetch(`${PAYMOB_API_URL}/auth/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ api_key: apiKey }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paymob authentication failed: ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.token;
  // Token expires in 1 hour, cache for 55 minutes
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;

  return cachedToken;
}

/**
 * Clear cached authentication token
 */
export function clearAuthToken(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}

/**
 * Make authenticated request to Paymob API
 */
export async function paymobRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const response = await fetch(`${PAYMOB_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paymob API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Register an order with Paymob
 */
export interface PaymobOrderRequest {
  authToken: string;
  deliveryNeeded: boolean;
  amountCents: number;
  currency: string;
  merchantOrderId: string;
  items: Array<{
    name: string;
    amountCents: number;
    description: string;
    quantity: number;
  }>;
}

export interface PaymobOrderResponse {
  id: number;
  created_at: string;
  delivery_needed: boolean;
  merchant: {
    id: number;
    created_at: string;
    phones: string[];
    company_emails: string[];
    company_name: string;
    state: string;
    country: string;
    city: string;
    postal_code: string;
    street: string;
  };
  collector: null;
  amount_cents: number;
  shipping_data: null;
  currency: string;
  is_payment_locked: boolean;
  is_return: boolean;
  is_cancel: boolean;
  is_returned: boolean;
  is_canceled: boolean;
  merchant_order_id: string;
  wallet_notification: null;
  paid_amount_cents: number;
  notify_user_with_email: boolean;
  items: Array<{
    name: string;
    description: string;
    amount_cents: number;
    quantity: number;
  }>;
  order_url: string;
  commission_fees: number;
  delivery_fees_cents: number;
  delivery_vat_cents: number;
  payment_method: string;
  merchant_staff_tag: null;
  api_source: string;
  data: Record<string, unknown>;
}

export async function createOrder(
  request: PaymobOrderRequest
): Promise<PaymobOrderResponse> {
  const response = await fetch(`${PAYMOB_API_URL}/ecommerce/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_token: request.authToken,
      delivery_needed: request.deliveryNeeded,
      amount_cents: request.amountCents,
      currency: request.currency,
      merchant_order_id: request.merchantOrderId,
      items: request.items,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Paymob order: ${errorText}`);
  }

  return response.json();
}

/**
 * Generate payment key for a specific payment method
 */
export interface PaymobPaymentKeyRequest {
  authToken: string;
  orderId: number;
  amountCents: number;
  currency: string;
  integrationId: number;
  billingData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  expiration?: number; // seconds until expiration
}

export interface PaymobPaymentKeyResponse {
  token: string;
}

export async function createPaymentKey(
  request: PaymobPaymentKeyRequest
): Promise<PaymobPaymentKeyResponse> {
  const response = await fetch(`${PAYMOB_API_URL}/acceptance/payment_keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_token: request.authToken,
      amount_cents: request.amountCents,
      expiration: request.expiration || 3600,
      order_id: request.orderId,
      billing_data: {
        first_name: request.billingData.firstName,
        last_name: request.billingData.lastName,
        email: request.billingData.email,
        phone_number: request.billingData.phone,
        street: request.billingData.street || 'NA',
        building: request.billingData.building || 'NA',
        floor: request.billingData.floor || 'NA',
        apartment: request.billingData.apartment || 'NA',
        city: request.billingData.city || 'NA',
        state: request.billingData.state || 'NA',
        country: request.billingData.country || 'EG',
        postal_code: request.billingData.postalCode || 'NA',
      },
      currency: request.currency,
      integration_id: request.integrationId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Paymob payment key: ${errorText}`);
  }

  return response.json();
}

/**
 * Verify Paymob webhook callback HMAC signature
 */
export function verifyWebhookSignature(
  receivedHmac: string,
  data: Record<string, unknown>
): boolean {
  const hmacSecret = getPaymobHmacSecret();

  // Paymob expects specific fields in specific order for HMAC calculation
  const hmacFields = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order.id',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
  ];

  // Build the concatenated string for HMAC
  let hmacString = '';
  for (const field of hmacFields) {
    const value = getNestedValue(data, field);
    hmacString += value !== undefined ? String(value) : '';
  }

  // Calculate HMAC
  const calculatedHmac = createHmac('sha512', hmacSecret)
    .update(hmacString)
    .digest('hex');

  return calculatedHmac === receivedHmac;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Paymob iframe URL for card payments
 */
export function getIframeUrl(paymentToken: string): string {
  return `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
}

/**
 * Refund a transaction
 */
export interface PaymobRefundRequest {
  authToken: string;
  transactionId: string;
  amountCents: number;
}

export interface PaymobRefundResponse {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  is_refunded: boolean;
  is_3d_secure: boolean;
  integration_id: number;
  profile_id: number;
  has_parent_transaction: boolean;
  order: {
    id: number;
    created_at: string;
    delivery_needed: boolean;
    merchant: Record<string, unknown>;
    collector: null;
    amount_cents: number;
    shipping_data: null;
    currency: string;
    is_payment_locked: boolean;
    merchant_order_id: string;
    wallet_notification: null;
    paid_amount_cents: number;
  };
  created_at: string;
  transaction_processed_callback_responses: unknown[];
  currency: string;
  source_data: {
    type: string;
    pan: string;
    sub_type: string;
    tenure: null;
  };
  api_source: string;
  is_void: boolean;
  is_refund: boolean;
  data: Record<string, unknown>;
  is_hidden: boolean;
  payment_key_claims: Record<string, unknown>;
  error_occured: boolean;
  is_live: boolean;
  refunded_amount_cents: number;
  captured_amount: number;
  merchant_staff_tag: null;
  owner: number;
  parent_transaction: number;
}

export async function refundTransaction(
  request: PaymobRefundRequest
): Promise<PaymobRefundResponse> {
  const response = await fetch(`${PAYMOB_API_URL}/acceptance/void_refund/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_token: request.authToken,
      transaction_id: request.transactionId,
      amount_cents: request.amountCents,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refund Paymob transaction: ${errorText}`);
  }

  return response.json();
}

/**
 * Void a transaction (before capture)
 */
export interface PaymobVoidRequest {
  authToken: string;
  transactionId: string;
}

export async function voidTransaction(
  request: PaymobVoidRequest
): Promise<PaymobRefundResponse> {
  const response = await fetch(`${PAYMOB_API_URL}/acceptance/void_refund/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_token: request.authToken,
      transaction_id: request.transactionId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to void Paymob transaction: ${errorText}`);
  }

  return response.json();
}

/**
 * Inquire about a transaction
 */
export interface PaymobTransactionInquiry {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  is_refunded: boolean;
  is_3d_secure: boolean;
  integration_id: number;
  profile_id: number;
  has_parent_transaction: boolean;
  order: PaymobOrderResponse;
  created_at: string;
  currency: string;
  terminal_id: null;
  merchant_commission: number;
  installment: null;
  discount_details: unknown[];
  is_void: boolean;
  is_refund: boolean;
  error_occured: boolean;
  refunded_amount_cents: number;
  captured_amount: number;
  merchant_staff_tag: null;
  updated_at: string;
  owner: number;
  parent_transaction: null;
  source_data: {
    type: string;
    pan: string;
    sub_type: string;
    tenure: null;
  };
}

export async function getTransaction(
  authToken: string,
  transactionId: string
): Promise<PaymobTransactionInquiry> {
  const response = await fetch(
    `${PAYMOB_API_URL}/acceptance/transactions/${transactionId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Paymob transaction: ${errorText}`);
  }

  return response.json();
}
