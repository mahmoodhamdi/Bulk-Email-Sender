/**
 * Checkout Session API Route
 * Creates checkout sessions for subscription purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rate-limit';
import { createCheckoutSessionSchema } from '@/lib/validations/payment';
import { getPaymentGateway, PaymentProvider, SubscriptionTier, isPaidTier } from '@/lib/payments';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check('checkout-create');
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
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = createCheckoutSessionSchema.parse(body);

    // Validate tier is a paid tier
    if (!isPaidTier(validated.tier as SubscriptionTier)) {
      return NextResponse.json(
        { error: 'Cannot create checkout for free tier' },
        { status: 400 }
      );
    }

    // Get the appropriate payment gateway
    const provider = validated.provider || PaymentProvider.STRIPE;
    const gateway = await getPaymentGateway(provider as PaymentProvider);

    // Create checkout session
    const result = await gateway.createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name || undefined,
      tier: validated.tier as SubscriptionTier,
      successUrl: validated.successUrl,
      cancelUrl: validated.cancelUrl,
      couponCode: validated.couponCode,
      trialDays: validated.trialDays,
      billingInterval: validated.billingInterval,
      metadata: validated.metadata,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        url: result.url,
        provider: result.provider,
        expiresAt: result.expiresAt?.toISOString(),
      },
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

    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
