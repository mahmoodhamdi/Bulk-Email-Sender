/**
 * Subscription Management API Route
 * GET: Get current user's subscription
 * PATCH: Update subscription (change tier)
 * DELETE: Cancel subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  updateSubscriptionSchema,
  cancelSubscriptionSchema,
} from '@/lib/validations/payment';
import {
  getPaymentGateway,
  PaymentProvider,
  SubscriptionTier,
  SubscriptionStatus,
  TIER_CONFIG,
  isPaidTier,
} from '@/lib/payments';

/**
 * GET /api/payments/subscription
 * Get the current user's subscription details
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check('subscription-get');
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429 }
    );
  }

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    // If no subscription exists, return FREE tier info
    if (!subscription) {
      const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];
      return NextResponse.json({
        success: true,
        data: {
          tier: SubscriptionTier.FREE,
          tierConfig: freeConfig,
          status: SubscriptionStatus.ACTIVE,
          provider: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          trialEnd: null,
          usage: {
            emailsSentThisMonth: 0,
            emailLimit: freeConfig.limits.emailsPerMonth,
            contactsCount: 0,
            contactLimit: freeConfig.limits.contacts,
          },
        },
      });
    }

    // Get tier configuration
    const tierConfig = TIER_CONFIG[subscription.tier as SubscriptionTier];

    // Calculate usage percentages
    const emailsPercentage = subscription.emailLimit
      ? Math.round((subscription.emailsSentThisMonth / subscription.emailLimit) * 100)
      : 0;
    const contactsPercentage = subscription.contactLimit
      ? Math.round((subscription.contactsCount / subscription.contactLimit) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        tier: subscription.tier,
        tierConfig,
        status: subscription.status,
        provider: subscription.provider,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt?.toISOString(),
        trialStart: subscription.trialStart?.toISOString(),
        trialEnd: subscription.trialEnd?.toISOString(),
        usage: {
          emailsSentThisMonth: subscription.emailsSentThisMonth,
          emailLimit: subscription.emailLimit,
          emailsRemaining: subscription.emailLimit
            ? subscription.emailLimit - subscription.emailsSentThisMonth
            : null,
          emailsPercentage,
          contactsCount: subscription.contactsCount,
          contactLimit: subscription.contactLimit,
          contactsRemaining: subscription.contactLimit
            ? subscription.contactLimit - subscription.contactsCount
            : null,
          contactsPercentage,
          usageResetAt: subscription.usageResetAt?.toISOString(),
        },
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payments/subscription
 * Update subscription tier
 */
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check('subscription-update');
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429 }
    );
  }

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = updateSubscriptionSchema.parse(body);

    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.provider || !subscription?.providerSubscriptionId) {
      return NextResponse.json(
        { error: 'No active paid subscription found' },
        { status: 404 }
      );
    }

    // Check if trying to downgrade to FREE (should cancel instead)
    if (!isPaidTier(validated.tier as SubscriptionTier)) {
      return NextResponse.json(
        { error: 'Use cancel endpoint to downgrade to free tier' },
        { status: 400 }
      );
    }

    // Get the payment gateway
    const gateway = await getPaymentGateway(subscription.provider as PaymentProvider);

    // Update subscription
    const updatedSubscription = await gateway.updateSubscription(
      subscription.providerSubscriptionId,
      validated.tier as SubscriptionTier
    );

    // Get updated tier config
    const tierConfig = TIER_CONFIG[validated.tier as SubscriptionTier];

    return NextResponse.json({
      success: true,
      data: {
        tier: updatedSubscription.tier,
        tierConfig,
        status: updatedSubscription.status,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd?.toISOString(),
      },
      message: `Subscription updated to ${tierConfig.name} plan`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    console.error('Update subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/subscription
 * Cancel subscription
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check('subscription-cancel');
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429 }
    );
  }

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body (optional)
    let validated = { immediately: false, reason: undefined as string | undefined };
    try {
      const body = await request.json();
      validated = cancelSubscriptionSchema.parse(body);
    } catch {
      // Empty body is acceptable, use defaults
    }

    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.provider || !subscription?.providerSubscriptionId) {
      return NextResponse.json(
        { error: 'No active paid subscription found' },
        { status: 404 }
      );
    }

    // Get the payment gateway
    const gateway = await getPaymentGateway(subscription.provider as PaymentProvider);

    // Cancel subscription
    await gateway.cancelSubscription(
      subscription.providerSubscriptionId,
      validated.immediately
    );

    // Update local subscription record
    if (validated.immediately) {
      const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
          providerSubscriptionId: null,
          providerPriceId: null,
          emailLimit: freeConfig.limits.emailsPerMonth,
          contactLimit: freeConfig.limits.contacts,
          metadata: validated.reason
            ? { cancelReason: validated.reason }
            : undefined,
        },
      });
    } else {
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          cancelAtPeriodEnd: true,
          metadata: validated.reason
            ? { cancelReason: validated.reason }
            : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: validated.immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at end of billing period',
      data: {
        canceledAt: validated.immediately ? new Date().toISOString() : null,
        cancelAtPeriodEnd: !validated.immediately,
        effectiveDate: validated.immediately
          ? new Date().toISOString()
          : subscription.currentPeriodEnd?.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/subscription
 * Resume a canceled subscription (if cancel_at_period_end was true)
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check('subscription-resume');
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429 }
    );
  }

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.provider || !subscription?.providerSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found to resume' },
        { status: 404 }
      );
    }

    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      );
    }

    // Get the payment gateway
    const gateway = await getPaymentGateway(subscription.provider as PaymentProvider);

    // Resume subscription
    await gateway.resumeSubscription(subscription.providerSubscriptionId);

    // Update local record
    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        cancelAtPeriodEnd: false,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      data: {
        tier: subscription.tier,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
      },
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}
