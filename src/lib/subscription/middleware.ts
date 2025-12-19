/**
 * Subscription Middleware
 * Provides route protection based on subscription tier and usage limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TIER_CONFIG,
  TierLimits,
  canAccessFeature,
} from '@/lib/payments/types';

// Feature keys that are boolean in TierLimits
export type TierFeature = 'abTesting' | 'automation' | 'apiAccess' | 'webhooks' | 'customBranding' | 'prioritySupport' | 'dedicatedSupport' | 'customIntegrations';

export interface SubscriptionFeatures {
  templates: boolean;
  abTesting: boolean;
  automation: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  customIntegrations: boolean;
}

export interface SubscriptionContext {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  emailsRemaining: number | null;
  contactsRemaining: number | null;
  features: SubscriptionFeatures;
}

/**
 * Extract boolean features from tier limits
 */
function extractFeatures(limits: TierLimits): SubscriptionFeatures {
  return {
    templates: limits.templates !== null && limits.templates > 0,
    abTesting: limits.abTesting,
    automation: limits.automation,
    apiAccess: limits.apiAccess,
    webhooks: limits.webhooks,
    customBranding: limits.customBranding,
    prioritySupport: limits.prioritySupport,
    dedicatedSupport: limits.dedicatedSupport,
    customIntegrations: limits.customIntegrations,
  };
}

/**
 * Get subscription context for a user
 */
export async function getSubscriptionContext(
  userId: string
): Promise<SubscriptionContext | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    // Return FREE tier context
    const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];
    return {
      userId,
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      emailsRemaining: freeConfig.limits.emailsPerMonth,
      contactsRemaining: freeConfig.limits.contacts,
      features: extractFeatures(freeConfig.limits),
    };
  }

  const tier = subscription.tier as SubscriptionTier;
  const tierConfig = TIER_CONFIG[tier];

  const emailLimit = subscription.emailLimit ?? tierConfig.limits.emailsPerMonth;
  const contactLimit = subscription.contactLimit ?? tierConfig.limits.contacts;

  return {
    userId,
    tier,
    status: subscription.status as SubscriptionStatus,
    emailsRemaining: emailLimit !== null
      ? Math.max(0, emailLimit - subscription.emailsSentThisMonth)
      : null,
    contactsRemaining: contactLimit !== null
      ? Math.max(0, contactLimit - subscription.contactsCount)
      : null,
    features: extractFeatures(tierConfig.limits),
  };
}

/**
 * Higher-order function to wrap API routes with subscription checks
 */
export function withSubscription<T extends unknown[]>(
  handler: (
    request: NextRequest,
    context: SubscriptionContext,
    ...args: T
  ) => Promise<NextResponse>,
  options?: {
    requiredTier?: SubscriptionTier;
    requiredFeature?: TierFeature;
    requireActive?: boolean;
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Check authentication
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Get subscription context
      const subContext = await getSubscriptionContext(session.user.id);
      if (!subContext) {
        return NextResponse.json(
          { error: 'Failed to get subscription info' },
          { status: 500 }
        );
      }

      // Check if subscription is active (if required)
      if (options?.requireActive !== false && subContext.status !== SubscriptionStatus.ACTIVE) {
        return NextResponse.json(
          {
            error: 'Subscription inactive',
            message: 'Your subscription is not active. Please update your payment method.',
            status: subContext.status,
          },
          { status: 403 }
        );
      }

      // Check required tier
      if (options?.requiredTier) {
        const tierOrder = [
          SubscriptionTier.FREE,
          SubscriptionTier.STARTER,
          SubscriptionTier.PRO,
          SubscriptionTier.ENTERPRISE,
        ];
        const currentTierIndex = tierOrder.indexOf(subContext.tier);
        const requiredTierIndex = tierOrder.indexOf(options.requiredTier);

        if (currentTierIndex < requiredTierIndex) {
          const requiredConfig = TIER_CONFIG[options.requiredTier];
          return NextResponse.json(
            {
              error: 'Upgrade required',
              message: `This feature requires the ${requiredConfig.name} plan or higher.`,
              requiredTier: options.requiredTier,
              currentTier: subContext.tier,
            },
            { status: 403 }
          );
        }
      }

      // Check required feature
      if (options?.requiredFeature) {
        if (!canAccessFeature(subContext.tier, options.requiredFeature)) {
          const currentConfig = TIER_CONFIG[subContext.tier];
          return NextResponse.json(
            {
              error: 'Feature not available',
              message: `${options.requiredFeature} is not available on the ${currentConfig.name} plan. Please upgrade to access this feature.`,
              feature: options.requiredFeature,
              currentTier: subContext.tier,
            },
            { status: 403 }
          );
        }
      }

      // Call the actual handler with subscription context
      return handler(request, subContext, ...args);
    } catch (error) {
      console.error('Subscription middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Higher-order function to check email sending limits
 */
export function withEmailLimit<T extends unknown[]>(
  handler: (
    request: NextRequest,
    context: SubscriptionContext,
    ...args: T
  ) => Promise<NextResponse>,
  getEmailCount?: (request: NextRequest) => Promise<number>
) {
  return withSubscription(async (request, context, ...args: T) => {
    // Check email limit
    if (context.emailsRemaining !== null) {
      const emailCount = getEmailCount
        ? await getEmailCount(request)
        : 1;

      if (emailCount > context.emailsRemaining) {
        const tierConfig = TIER_CONFIG[context.tier];
        return NextResponse.json(
          {
            error: 'Email limit exceeded',
            message: `You have reached your monthly email limit of ${tierConfig.limits.emailsPerMonth} emails. Upgrade your plan for more.`,
            remaining: context.emailsRemaining,
            requested: emailCount,
            currentTier: context.tier,
          },
          { status: 429 }
        );
      }
    }

    return handler(request, context, ...args);
  });
}

/**
 * Higher-order function to check contact limits
 */
export function withContactLimit<T extends unknown[]>(
  handler: (
    request: NextRequest,
    context: SubscriptionContext,
    ...args: T
  ) => Promise<NextResponse>,
  getContactCount?: (request: NextRequest) => Promise<number>
) {
  return withSubscription(async (request, context, ...args: T) => {
    // Check contact limit
    if (context.contactsRemaining !== null) {
      const contactCount = getContactCount
        ? await getContactCount(request)
        : 1;

      if (contactCount > context.contactsRemaining) {
        const tierConfig = TIER_CONFIG[context.tier];
        return NextResponse.json(
          {
            error: 'Contact limit exceeded',
            message: `You have reached your contact limit of ${tierConfig.limits.contacts} contacts. Upgrade your plan for more.`,
            remaining: context.contactsRemaining,
            requested: contactCount,
            currentTier: context.tier,
          },
          { status: 429 }
        );
      }
    }

    return handler(request, context, ...args);
  });
}

/**
 * Create a feature gate for specific features
 */
export function requireFeature(feature: TierFeature) {
  return <T extends unknown[]>(
    handler: (
      request: NextRequest,
      context: SubscriptionContext,
      ...args: T
    ) => Promise<NextResponse>
  ) => withSubscription(handler, { requiredFeature: feature });
}

/**
 * Create a tier gate for specific tiers
 */
export function requireTier(tier: SubscriptionTier) {
  return <T extends unknown[]>(
    handler: (
      request: NextRequest,
      context: SubscriptionContext,
      ...args: T
    ) => Promise<NextResponse>
  ) => withSubscription(handler, { requiredTier: tier });
}

/**
 * Middleware to add subscription info to headers
 * Can be used in Next.js middleware for client-side access
 */
export async function addSubscriptionHeaders(
  request: NextRequest,
  userId: string
): Promise<Headers> {
  const headers = new Headers(request.headers);

  const context = await getSubscriptionContext(userId);
  if (context) {
    headers.set('x-subscription-tier', context.tier);
    headers.set('x-subscription-status', context.status);
    headers.set('x-emails-remaining', String(context.emailsRemaining ?? 'unlimited'));
    headers.set('x-contacts-remaining', String(context.contactsRemaining ?? 'unlimited'));
    headers.set('x-features', JSON.stringify(context.features));
  }

  return headers;
}
