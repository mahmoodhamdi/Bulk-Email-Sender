/**
 * Billing Store
 * Zustand store for managing billing and subscription state
 */

import { create } from 'zustand';
import {
  SubscriptionTier,
  SubscriptionStatus,
  PaymentProvider,
  TIER_CONFIG,
  TierConfig,
} from '@/lib/payments/types';

export interface SubscriptionData {
  id: string;
  tier: SubscriptionTier;
  tierConfig: TierConfig;
  status: SubscriptionStatus;
  provider: PaymentProvider | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  usage: {
    emailsSentThisMonth: number;
    emailLimit: number | null;
    emailsRemaining: number | null;
    emailsPercentage: number;
    contactsCount: number;
    contactLimit: number | null;
    contactsRemaining: number | null;
    contactsPercentage: number;
    usageResetAt: string | null;
  };
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
  receiptUrl: string | null;
}

export interface BillingState {
  // Subscription data
  subscription: SubscriptionData | null;
  isLoading: boolean;
  error: string | null;

  // Payment history
  paymentHistory: PaymentHistoryItem[];
  isLoadingHistory: boolean;

  // Checkout
  checkoutUrl: string | null;
  isCheckingOut: boolean;
  checkoutError: string | null;

  // Portal
  portalUrl: string | null;
  isOpeningPortal: boolean;

  // Available providers
  availableProviders: PaymentProvider[];

  // Actions
  fetchSubscription: () => Promise<void>;
  fetchPaymentHistory: () => Promise<void>;
  createCheckout: (
    tier: SubscriptionTier,
    provider?: PaymentProvider,
    billingInterval?: 'monthly' | 'yearly'
  ) => Promise<string | null>;
  openCustomerPortal: (returnUrl?: string) => Promise<string | null>;
  cancelSubscription: (immediately?: boolean) => Promise<boolean>;
  resumeSubscription: () => Promise<boolean>;
  updateSubscription: (tier: SubscriptionTier) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  // Initial state
  subscription: null,
  isLoading: false,
  error: null,
  paymentHistory: [],
  isLoadingHistory: false,
  checkoutUrl: null,
  isCheckingOut: false,
  checkoutError: null,
  portalUrl: null,
  isOpeningPortal: false,
  availableProviders: [],

  // Fetch current subscription
  fetchSubscription: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/payments/subscription', {
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();

      set({
        subscription: data.data,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch subscription',
        isLoading: false,
      });
    }
  },

  // Fetch payment history
  fetchPaymentHistory: async () => {
    set({ isLoadingHistory: true });

    try {
      const response = await fetch('/api/payments/history', {
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const data = await response.json();

      set({
        paymentHistory: data.data || [],
        isLoadingHistory: false,
      });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  // Create checkout session
  createCheckout: async (tier, provider, billingInterval = 'monthly') => {
    set({ isCheckingOut: true, checkoutError: null, checkoutUrl: null });

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          tier,
          provider,
          billingInterval,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const data = await response.json();
      const url = data.data?.url;

      set({
        checkoutUrl: url,
        isCheckingOut: false,
      });

      return url;
    } catch (error) {
      set({
        checkoutError: error instanceof Error ? error.message : 'Failed to create checkout',
        isCheckingOut: false,
      });
      return null;
    }
  },

  // Open customer portal
  openCustomerPortal: async (returnUrl) => {
    set({ isOpeningPortal: true, portalUrl: null });

    try {
      const response = await fetch('/api/payments/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          returnUrl: returnUrl || `${window.location.origin}/billing`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to open customer portal');
      }

      const data = await response.json();
      const url = data.data?.url;

      set({
        portalUrl: url,
        isOpeningPortal: false,
      });

      return url;
    } catch {
      set({ isOpeningPortal: false });
      return null;
    }
  },

  // Cancel subscription
  cancelSubscription: async (immediately = false) => {
    try {
      const response = await fetch('/api/payments/subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ immediately }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Refresh subscription data
      await get().fetchSubscription();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel subscription' });
      return false;
    }
  },

  // Resume subscription
  resumeSubscription: async () => {
    try {
      const response = await fetch('/api/payments/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to resume subscription');
      }

      // Refresh subscription data
      await get().fetchSubscription();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to resume subscription' });
      return false;
    }
  },

  // Update subscription tier
  updateSubscription: async (tier) => {
    try {
      const response = await fetch('/api/payments/subscription', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      // Refresh subscription data
      await get().fetchSubscription();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update subscription' });
      return false;
    }
  },

  // Clear error
  clearError: () => set({ error: null, checkoutError: null }),

  // Reset store
  reset: () => set({
    subscription: null,
    isLoading: false,
    error: null,
    paymentHistory: [],
    isLoadingHistory: false,
    checkoutUrl: null,
    isCheckingOut: false,
    checkoutError: null,
    portalUrl: null,
    isOpeningPortal: false,
  }),
}));

// Selectors
export const selectSubscription = (state: BillingState) => state.subscription;
export const selectTier = (state: BillingState) => state.subscription?.tier || SubscriptionTier.FREE;
export const selectStatus = (state: BillingState) => state.subscription?.status || SubscriptionStatus.ACTIVE;
export const selectUsage = (state: BillingState) => state.subscription?.usage;
export const selectIsLoading = (state: BillingState) => state.isLoading;
export const selectError = (state: BillingState) => state.error;

// Helper to check if user can access a feature (boolean features from limits)
export const canAccessFeature = (state: BillingState, feature: 'abTesting' | 'automation' | 'apiAccess' | 'webhooks' | 'customBranding' | 'prioritySupport' | 'dedicatedSupport' | 'customIntegrations') => {
  const tier = state.subscription?.tier || SubscriptionTier.FREE;
  const tierConfig = TIER_CONFIG[tier];
  return tierConfig.limits[feature];
};

// Helper to check if user is on a paid plan
export const isPaidPlan = (state: BillingState): boolean => {
  const tier = state.subscription?.tier;
  return tier !== undefined && tier !== SubscriptionTier.FREE;
};

// Helper to format price
export const formatPrice = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
};
