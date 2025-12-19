/**
 * Payment Gateway System
 * Unified payment gateway factory and exports
 */

import {
  PaymentGateway,
  PaymentProvider,
  getProviderForCountry,
} from './types';

// Gateway instances (lazy-loaded singletons)
const gateways: Map<PaymentProvider, PaymentGateway> = new Map();

/**
 * Get a payment gateway instance by provider
 * Uses singleton pattern for efficiency
 */
export async function getPaymentGateway(provider: PaymentProvider): Promise<PaymentGateway> {
  if (!gateways.has(provider)) {
    let gateway: PaymentGateway;

    switch (provider) {
      case PaymentProvider.STRIPE: {
        const { StripeGateway } = await import('./stripe');
        gateway = new StripeGateway();
        break;
      }
      case PaymentProvider.PAYMOB: {
        const { PaymobGateway } = await import('./paymob');
        gateway = new PaymobGateway();
        break;
      }
      case PaymentProvider.PAYTABS: {
        const { PayTabsGateway } = await import('./paytabs');
        gateway = new PayTabsGateway();
        break;
      }
      case PaymentProvider.PADDLE: {
        const { PaddleGateway } = await import('./paddle');
        gateway = new PaddleGateway();
        break;
      }
      default:
        throw new Error(`Unknown payment provider: ${provider}`);
    }

    gateways.set(provider, gateway);
  }

  return gateways.get(provider)!;
}

/**
 * Get the recommended gateway for a country/region
 * Auto-selects based on country code
 */
export async function getGatewayForRegion(countryCode?: string): Promise<PaymentGateway> {
  const provider = getProviderForCountry(countryCode);
  return getPaymentGateway(provider);
}

/**
 * Get all available gateways
 * Useful for admin dashboards or testing
 */
export async function getAllGateways(): Promise<PaymentGateway[]> {
  const providers = [
    PaymentProvider.STRIPE,
    PaymentProvider.PAYMOB,
    PaymentProvider.PAYTABS,
    PaymentProvider.PADDLE,
  ];

  const gateways: PaymentGateway[] = [];
  for (const provider of providers) {
    try {
      const gateway = await getPaymentGateway(provider);
      gateways.push(gateway);
    } catch {
      // Provider not configured, skip
      console.warn(`Payment provider ${provider} is not configured`);
    }
  }

  return gateways;
}

/**
 * Check if a payment provider is available/configured
 */
export function isProviderAvailable(provider: PaymentProvider): boolean {
  switch (provider) {
    case PaymentProvider.STRIPE:
      return Boolean(process.env.STRIPE_SECRET_KEY);
    case PaymentProvider.PAYMOB:
      return Boolean(process.env.PAYMOB_API_KEY);
    case PaymentProvider.PAYTABS:
      return Boolean(process.env.PAYTABS_SERVER_KEY);
    case PaymentProvider.PADDLE:
      return Boolean(process.env.PADDLE_API_KEY);
    default:
      return false;
  }
}

/**
 * Get list of available (configured) providers
 */
export function getAvailableProviders(): PaymentProvider[] {
  return Object.values(PaymentProvider).filter(isProviderAvailable);
}

/**
 * Clear cached gateway instances
 * Useful for testing or when credentials change
 */
export function clearGatewayCache(): void {
  gateways.clear();
}

// Re-export all types
export * from './types';

// Re-export validation schemas
export * from '../validations/payment';
