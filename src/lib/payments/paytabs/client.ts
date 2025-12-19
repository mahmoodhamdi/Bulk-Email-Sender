/**
 * PayTabs API Client Configuration
 * Handles authentication and HTTP requests to PayTabs API
 */

import { createHmac } from 'crypto';

// PayTabs API base URLs by region
const PAYTABS_API_URLS: Record<string, string> = {
  SAU: 'https://secure.paytabs.sa',     // Saudi Arabia
  ARE: 'https://secure.paytabs.com',    // UAE
  EGY: 'https://secure-egypt.paytabs.com', // Egypt
  OMN: 'https://secure-oman.paytabs.com',  // Oman
  JOR: 'https://secure-jordan.paytabs.com', // Jordan
  GLOBAL: 'https://secure-global.paytabs.com', // Global
};

// Environment variable getters
export function getPayTabsProfileId(): string {
  const profileId = process.env.PAYTABS_PROFILE_ID;
  if (!profileId) {
    throw new Error('PAYTABS_PROFILE_ID environment variable is required');
  }
  return profileId;
}

export function getPayTabsServerKey(): string {
  const serverKey = process.env.PAYTABS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('PAYTABS_SERVER_KEY environment variable is required');
  }
  return serverKey;
}

export function getPayTabsClientKey(): string {
  return process.env.PAYTABS_CLIENT_KEY || '';
}

export function getPayTabsRegion(): string {
  return process.env.PAYTABS_REGION || 'SAU';
}

export function getPayTabsApiUrl(): string {
  const region = getPayTabsRegion();
  return PAYTABS_API_URLS[region] || PAYTABS_API_URLS.GLOBAL;
}

export function isPayTabsConfigured(): boolean {
  return !!(
    process.env.PAYTABS_PROFILE_ID &&
    process.env.PAYTABS_SERVER_KEY
  );
}

/**
 * Make authenticated request to PayTabs API
 */
export async function payTabsRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const baseUrl = getPayTabsApiUrl();
  const serverKey = getPayTabsServerKey();

  const response = await fetch(`${baseUrl}/payment${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: serverKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayTabs API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Create a payment page (redirect flow)
 */
export interface PayTabsPaymentPageRequest {
  profileId: string;
  cartId: string;
  cartAmount: number;
  cartCurrency: string;
  cartDescription: string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  shippingDetails?: {
    name: string;
    email: string;
    phone: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  callbackUrl: string;
  returnUrl: string;
  paymentMethods?: string[]; // ['creditcard', 'mada', 'applepay', etc.]
  hideShipping?: boolean;
  tokenize?: number; // 2 for tokenization
  showSaveCard?: boolean;
  token?: string; // For using saved card
  transRef?: string; // For recurring payments
}

export interface PayTabsPaymentPageResponse {
  tran_ref: string;
  tran_type: string;
  cart_id: string;
  cart_description: string;
  cart_currency: string;
  cart_amount: string;
  return: string;
  redirect_url: string;
  serviceId: number;
  profileId: number;
  merchantId: number;
  trace: string;
}

export async function createPaymentPage(
  request: PayTabsPaymentPageRequest
): Promise<PayTabsPaymentPageResponse> {
  const body: Record<string, unknown> = {
    profile_id: request.profileId,
    tran_type: 'sale',
    tran_class: 'ecom',
    cart_id: request.cartId,
    cart_amount: request.cartAmount,
    cart_currency: request.cartCurrency,
    cart_description: request.cartDescription,
    callback: request.callbackUrl,
    return: request.returnUrl,
    hide_shipping: request.hideShipping ?? true,
    customer_details: {
      name: request.customerDetails.name,
      email: request.customerDetails.email,
      phone: request.customerDetails.phone,
      street1: request.customerDetails.street || 'NA',
      city: request.customerDetails.city || 'NA',
      state: request.customerDetails.state || 'NA',
      country: request.customerDetails.country || 'SA',
      zip: request.customerDetails.zip || '00000',
    },
  };

  if (request.shippingDetails) {
    body.shipping_details = {
      name: request.shippingDetails.name,
      email: request.shippingDetails.email,
      phone: request.shippingDetails.phone,
      street1: request.shippingDetails.street || 'NA',
      city: request.shippingDetails.city || 'NA',
      state: request.shippingDetails.state || 'NA',
      country: request.shippingDetails.country || 'SA',
      zip: request.shippingDetails.zip || '00000',
    };
  }

  if (request.paymentMethods && request.paymentMethods.length > 0) {
    body.payment_methods = request.paymentMethods;
  }

  if (request.tokenize) {
    body.tokenise = request.tokenize;
    body.show_save_card = request.showSaveCard ?? true;
  }

  if (request.token) {
    body.token = request.token;
  }

  if (request.transRef) {
    body.tran_ref = request.transRef;
  }

  return payTabsRequest<PayTabsPaymentPageResponse>('/request', body);
}

/**
 * Query a transaction
 */
export interface PayTabsTransactionQueryResponse {
  tran_ref: string;
  tran_type: string;
  cart_id: string;
  cart_description: string;
  cart_currency: string;
  cart_amount: string;
  tran_currency: string;
  tran_amount: string;
  customer_details: {
    name: string;
    email: string;
    phone: string;
    street1: string;
    city: string;
    state: string;
    country: string;
    zip: string;
    ip: string;
  };
  payment_result: {
    response_status: string;
    response_code: string;
    response_message: string;
    transaction_time: string;
  };
  payment_info: {
    payment_method: string;
    card_type: string;
    card_scheme: string;
    payment_description: string;
  };
  token?: string;
  serviceId: number;
  profileId: number;
  merchantId: number;
  trace: string;
}

export async function queryTransaction(
  transRef: string
): Promise<PayTabsTransactionQueryResponse> {
  const profileId = getPayTabsProfileId();

  return payTabsRequest<PayTabsTransactionQueryResponse>('/query', {
    profile_id: profileId,
    tran_ref: transRef,
  });
}

/**
 * Refund a transaction
 */
export interface PayTabsRefundRequest {
  transRef: string;
  amount: number;
  currency: string;
  cartId: string;
  cartDescription: string;
}

export interface PayTabsRefundResponse {
  tran_ref: string;
  previous_tran_ref: string;
  cart_id: string;
  cart_description: string;
  cart_currency: string;
  cart_amount: string;
  tran_currency: string;
  tran_amount: string;
  payment_result: {
    response_status: string;
    response_code: string;
    response_message: string;
    transaction_time: string;
  };
  serviceId: number;
  profileId: number;
  merchantId: number;
  trace: string;
}

export async function refundTransaction(
  request: PayTabsRefundRequest
): Promise<PayTabsRefundResponse> {
  const profileId = getPayTabsProfileId();

  return payTabsRequest<PayTabsRefundResponse>('/refund', {
    profile_id: profileId,
    tran_type: 'refund',
    tran_class: 'ecom',
    cart_id: request.cartId,
    cart_amount: request.amount,
    cart_currency: request.currency,
    cart_description: request.cartDescription,
    tran_ref: request.transRef,
  });
}

/**
 * Void a transaction (before settlement)
 */
export interface PayTabsVoidResponse {
  tran_ref: string;
  previous_tran_ref: string;
  cart_id: string;
  payment_result: {
    response_status: string;
    response_code: string;
    response_message: string;
  };
}

export async function voidTransaction(
  transRef: string,
  cartId: string
): Promise<PayTabsVoidResponse> {
  const profileId = getPayTabsProfileId();

  return payTabsRequest<PayTabsVoidResponse>('/void', {
    profile_id: profileId,
    tran_type: 'void',
    tran_class: 'ecom',
    cart_id: cartId,
    tran_ref: transRef,
  });
}

/**
 * Delete a saved token
 */
export async function deleteToken(token: string): Promise<{ result: string }> {
  const profileId = getPayTabsProfileId();

  return payTabsRequest<{ result: string }>('/token/delete', {
    profile_id: profileId,
    token,
  });
}

/**
 * Verify PayTabs callback/webhook signature
 */
export function verifyCallbackSignature(
  signature: string,
  data: Record<string, unknown>
): boolean {
  const serverKey = getPayTabsServerKey();

  // PayTabs uses a specific field ordering for signature
  // The signature is computed over the response body
  const dataString = JSON.stringify(data);
  const calculatedSignature = createHmac('sha256', serverKey)
    .update(dataString)
    .digest('hex');

  return calculatedSignature === signature;
}

/**
 * Check if a transaction was successful
 */
export function isTransactionSuccessful(
  response: PayTabsTransactionQueryResponse
): boolean {
  return response.payment_result.response_status === 'A'; // Authorised
}

/**
 * PayTabs transaction status codes
 */
export const PAYTABS_RESPONSE_STATUS = {
  A: 'Authorised',
  H: 'Hold',
  P: 'Pending',
  V: 'Voided',
  E: 'Error',
  D: 'Declined',
} as const;
