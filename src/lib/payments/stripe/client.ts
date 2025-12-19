/**
 * Stripe Client Configuration
 * Server-side Stripe SDK initialization
 */

import Stripe from 'stripe';

// Singleton instance
let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe SDK instance (server-side only)
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-04-30.basil', // Latest API version
      typescript: true,
      appInfo: {
        name: 'Bulk Email Sender',
        version: '1.0.0',
      },
    });
  }

  return stripeInstance;
}

/**
 * Get Stripe price IDs from environment variables
 */
export function getStripePriceIds() {
  return {
    starter: {
      monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
    },
    enterprise: {
      monthly: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY,
    },
  };
}

/**
 * Get Stripe webhook secret
 */
export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Get the publishable key for client-side use
 */
export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set');
  }
  return key;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Clear the Stripe instance (useful for testing)
 */
export function clearStripeClient(): void {
  stripeInstance = null;
}
