/**
 * Subscription Usage Tracking Service
 * Tracks and enforces usage limits based on subscription tier
 */

import { prisma } from '@/lib/db/prisma';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TIER_CONFIG,
  canAccessFeature,
  TierFeature,
} from '@/lib/payments/types';

export interface UsageInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  emailsSentThisMonth: number;
  emailLimit: number | null;
  emailsRemaining: number | null;
  emailUsagePercent: number;
  contactsCount: number;
  contactLimit: number | null;
  contactsRemaining: number | null;
  contactUsagePercent: number;
  usageResetAt: Date | null;
  isOverLimit: boolean;
  canSendEmails: boolean;
  canAddContacts: boolean;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number | null;
  remaining?: number | null;
}

/**
 * Get usage information for a user
 */
export async function getUserUsage(userId: string): Promise<UsageInfo> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  // Default to FREE tier if no subscription
  const tier = (subscription?.tier as SubscriptionTier) || SubscriptionTier.FREE;
  const status = (subscription?.status as SubscriptionStatus) || SubscriptionStatus.ACTIVE;
  const tierConfig = TIER_CONFIG[tier];

  const emailsSentThisMonth = subscription?.emailsSentThisMonth || 0;
  const emailLimit = subscription?.emailLimit ?? tierConfig.limits.emailsPerMonth;
  const contactsCount = subscription?.contactsCount || 0;
  const contactLimit = subscription?.contactLimit ?? tierConfig.limits.contacts;

  const emailsRemaining = emailLimit !== null ? Math.max(0, emailLimit - emailsSentThisMonth) : null;
  const contactsRemaining = contactLimit !== null ? Math.max(0, contactLimit - contactsCount) : null;

  const emailUsagePercent = emailLimit ? Math.round((emailsSentThisMonth / emailLimit) * 100) : 0;
  const contactUsagePercent = contactLimit ? Math.round((contactsCount / contactLimit) * 100) : 0;

  const isOverEmailLimit = emailLimit !== null && emailsSentThisMonth >= emailLimit;
  const isOverContactLimit = contactLimit !== null && contactsCount >= contactLimit;

  return {
    tier,
    status,
    emailsSentThisMonth,
    emailLimit,
    emailsRemaining,
    emailUsagePercent,
    contactsCount,
    contactLimit,
    contactsRemaining,
    contactUsagePercent,
    usageResetAt: subscription?.usageResetAt || null,
    isOverLimit: isOverEmailLimit || isOverContactLimit,
    canSendEmails: !isOverEmailLimit && status === SubscriptionStatus.ACTIVE,
    canAddContacts: !isOverContactLimit && status === SubscriptionStatus.ACTIVE,
  };
}

/**
 * Check if user can send emails
 */
export async function checkEmailLimit(
  userId: string,
  emailCount: number = 1
): Promise<UsageCheckResult> {
  const usage = await getUserUsage(userId);

  if (usage.status !== SubscriptionStatus.ACTIVE) {
    return {
      allowed: false,
      reason: 'Subscription is not active',
    };
  }

  // Unlimited emails for enterprise
  if (usage.emailLimit === null) {
    return { allowed: true };
  }

  const wouldExceed = usage.emailsSentThisMonth + emailCount > usage.emailLimit;

  if (wouldExceed) {
    return {
      allowed: false,
      reason: `Email limit exceeded. ${usage.emailsRemaining} emails remaining this month.`,
      currentUsage: usage.emailsSentThisMonth,
      limit: usage.emailLimit,
      remaining: usage.emailsRemaining,
    };
  }

  return {
    allowed: true,
    currentUsage: usage.emailsSentThisMonth,
    limit: usage.emailLimit,
    remaining: usage.emailsRemaining,
  };
}

/**
 * Check if user can add contacts
 */
export async function checkContactLimit(
  userId: string,
  contactCount: number = 1
): Promise<UsageCheckResult> {
  const usage = await getUserUsage(userId);

  if (usage.status !== SubscriptionStatus.ACTIVE) {
    return {
      allowed: false,
      reason: 'Subscription is not active',
    };
  }

  // Unlimited contacts for enterprise
  if (usage.contactLimit === null) {
    return { allowed: true };
  }

  const wouldExceed = usage.contactsCount + contactCount > usage.contactLimit;

  if (wouldExceed) {
    return {
      allowed: false,
      reason: `Contact limit exceeded. ${usage.contactsRemaining} contacts remaining.`,
      currentUsage: usage.contactsCount,
      limit: usage.contactLimit,
      remaining: usage.contactsRemaining,
    };
  }

  return {
    allowed: true,
    currentUsage: usage.contactsCount,
    limit: usage.contactLimit,
    remaining: usage.contactsRemaining,
  };
}

/**
 * Check if user can access a specific feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: TierFeature
): Promise<UsageCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const tier = (subscription?.tier as SubscriptionTier) || SubscriptionTier.FREE;
  const status = (subscription?.status as SubscriptionStatus) || SubscriptionStatus.ACTIVE;

  if (status !== SubscriptionStatus.ACTIVE) {
    return {
      allowed: false,
      reason: 'Subscription is not active',
    };
  }

  const hasAccess = canAccessFeature(tier, feature);

  if (!hasAccess) {
    const tierConfig = TIER_CONFIG[tier];
    return {
      allowed: false,
      reason: `${feature} is not available on the ${tierConfig.name} plan. Please upgrade to access this feature.`,
    };
  }

  return { allowed: true };
}

/**
 * Increment email sent count
 */
export async function incrementEmailCount(
  userId: string,
  count: number = 1
): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: {
      emailsSentThisMonth: {
        increment: count,
      },
    },
  });
}

/**
 * Increment contact count
 */
export async function incrementContactCount(
  userId: string,
  count: number = 1
): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: {
      contactsCount: {
        increment: count,
      },
    },
  });
}

/**
 * Decrement contact count (when contacts are deleted)
 */
export async function decrementContactCount(
  userId: string,
  count: number = 1
): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: {
      contactsCount: {
        decrement: count,
      },
    },
  });
}

/**
 * Reset monthly email usage
 * Should be called by a cron job on billing cycle date
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: {
      emailsSentThisMonth: 0,
      usageResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Sync contact count from database
 * Useful when contacts are imported or deleted in bulk
 */
export async function syncContactCount(userId: string): Promise<void> {
  const contactCount = await prisma.contact.count({
    where: {
      listMembers: {
        some: {
          list: {
            userId,
          },
        },
      },
    },
  });

  await prisma.subscription.update({
    where: { userId },
    data: {
      contactsCount: contactCount,
    },
  });
}

/**
 * Get subscription tier for a user
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true },
  });

  return (subscription?.tier as SubscriptionTier) || SubscriptionTier.FREE;
}

/**
 * Check if user has a paid subscription
 */
export async function isPaidUser(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier !== SubscriptionTier.FREE;
}

/**
 * Get tier limits for a user
 */
export async function getUserLimits(userId: string): Promise<{
  emailsPerMonth: number | null;
  contacts: number | null;
  smtpConfigs: number;
  templates: boolean;
  abTesting: boolean;
  automation: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  customIntegrations: boolean;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const tier = (subscription?.tier as SubscriptionTier) || SubscriptionTier.FREE;
  const tierConfig = TIER_CONFIG[tier];
  const limits = tierConfig.limits;

  return {
    emailsPerMonth: subscription?.emailLimit ?? limits.emailsPerMonth,
    contacts: subscription?.contactLimit ?? limits.contacts,
    smtpConfigs: limits.smtpConfigs,
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
