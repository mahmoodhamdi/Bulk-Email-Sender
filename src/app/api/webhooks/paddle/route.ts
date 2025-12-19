/**
 * Paddle Webhook Handler
 * Handles subscription and transaction events from Paddle
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaddleGateway } from '@/lib/payments/paddle';
import {
  verifyWebhookSignature,
  parseWebhookSignature,
} from '@/lib/payments/paddle/client';

export async function POST(request: NextRequest) {
  try {
    // Get the signature from headers
    const signature = request.headers.get('paddle-signature') || '';

    // Get the raw body for signature verification
    const body = await request.text();

    // Parse and verify signature
    const parsed = parseWebhookSignature(signature);
    if (!parsed) {
      console.error('Invalid Paddle webhook signature format');
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 401 }
      );
    }

    if (!verifyWebhookSignature(parsed.h1, parsed.ts, body)) {
      console.error('Paddle webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);

    // Process the webhook
    const gateway = new PaddleGateway();
    await gateway.handleWebhook(payload, signature);

    // Return success
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paddle webhook error:', error);

    // Return 200 to prevent retries for processing errors
    return NextResponse.json(
      { received: true, error: 'Processing error' },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
