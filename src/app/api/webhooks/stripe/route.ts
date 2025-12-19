/**
 * Stripe Webhook Handler
 * Receives and processes Stripe webhook events
 *
 * This route is exempt from CSRF protection (configured in middleware)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { StripeGateway } from '@/lib/payments/stripe';
import { isStripeConfigured } from '@/lib/payments/stripe/client';

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  try {
    // Get the raw body as text for signature verification
    const body = await request.text();

    // Get the Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Initialize Stripe gateway
    const stripeGateway = new StripeGateway();

    // Construct and verify the event
    let event;
    try {
      event = await stripeGateway.constructWebhookEvent(body, signature);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Handle the event
    const result = await stripeGateway.handleWebhookEvent(event);

    if (!result.processed) {
      console.error(`Failed to process webhook event: ${result.error}`);
      // Still return 200 to acknowledge receipt
      // Stripe will not retry if we return 200
    }

    return NextResponse.json({
      received: true,
      type: result.eventType,
      processed: result.processed,
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Stripe webhooks don't need other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
