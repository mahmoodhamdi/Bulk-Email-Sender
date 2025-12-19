/**
 * Customer Portal API Route
 * Creates sessions for the payment provider's customer portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { createPortalSessionSchema } from '@/lib/validations/payment';
import { getPaymentGateway, PaymentProvider } from '@/lib/payments';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check('portal-create');
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
    const validated = createPortalSessionSchema.parse(body);

    // Get user's subscription to determine provider
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { provider: true, providerCustomerId: true },
    });

    if (!subscription?.provider || !subscription?.providerCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get the appropriate payment gateway
    const gateway = await getPaymentGateway(subscription.provider as PaymentProvider);

    // Create portal session
    const result = await gateway.createCustomerPortalSession({
      userId: session.user.id,
      returnUrl: validated.returnUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        provider: result.provider,
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

    console.error('Portal session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
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
