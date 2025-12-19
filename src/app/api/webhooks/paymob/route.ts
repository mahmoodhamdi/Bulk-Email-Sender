/**
 * Paymob Webhook Handler
 * Handles transaction callbacks from Paymob
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymobGateway } from '@/lib/payments/paymob';
import { verifyWebhookSignature } from '@/lib/payments/paymob/client';

export async function POST(request: NextRequest) {
  try {
    // Get the HMAC signature from query params or headers
    const hmac = request.nextUrl.searchParams.get('hmac') ||
      request.headers.get('x-paymob-signature') ||
      '';

    // Parse the callback data
    const payload = await request.json();

    // Verify the signature
    if (!verifyWebhookSignature(hmac, payload)) {
      console.error('Paymob webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Process the webhook
    const gateway = new PaymobGateway();
    await gateway.handleWebhook(payload, hmac);

    // Return success
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paymob webhook error:', error);

    // Return 200 to prevent retries for processing errors
    // Log the error for investigation
    return NextResponse.json(
      { received: true, error: 'Processing error' },
      { status: 200 }
    );
  }
}

// Also handle GET for redirect callbacks
export async function GET(request: NextRequest) {
  try {
    // Paymob sends transaction data as query params for redirect callbacks
    const searchParams = request.nextUrl.searchParams;
    const success = searchParams.get('success') === 'true';
    const transactionId = searchParams.get('id');
    const orderId = searchParams.get('order');
    const hmac = searchParams.get('hmac') || '';

    // Build payload from query params for verification
    const payload = {
      id: transactionId,
      success,
      amount_cents: searchParams.get('amount_cents'),
      created_at: searchParams.get('created_at'),
      currency: searchParams.get('currency'),
      error_occured: searchParams.get('error_occured') === 'true',
      has_parent_transaction: searchParams.get('has_parent_transaction') === 'true',
      integration_id: searchParams.get('integration_id'),
      is_3d_secure: searchParams.get('is_3d_secure') === 'true',
      is_auth: searchParams.get('is_auth') === 'true',
      is_capture: searchParams.get('is_capture') === 'true',
      is_refunded: searchParams.get('is_refunded') === 'true',
      is_standalone_payment: searchParams.get('is_standalone_payment') === 'true',
      is_voided: searchParams.get('is_voided') === 'true',
      order: { id: orderId },
      owner: searchParams.get('owner'),
      pending: searchParams.get('pending') === 'true',
      source_data: {
        pan: searchParams.get('source_data.pan'),
        sub_type: searchParams.get('source_data.sub_type'),
        type: searchParams.get('source_data.type'),
      },
    };

    // Verify signature
    if (!verifyWebhookSignature(hmac, payload)) {
      console.error('Paymob redirect signature verification failed');
      return NextResponse.redirect(new URL('/billing?error=invalid_signature', request.url));
    }

    // Process the callback
    const gateway = new PaymobGateway();
    await gateway.handleWebhook(payload, hmac);

    // Redirect to success or failure page
    if (success) {
      return NextResponse.redirect(new URL('/billing?success=true', request.url));
    } else {
      return NextResponse.redirect(new URL('/billing?error=payment_failed', request.url));
    }
  } catch (error) {
    console.error('Paymob redirect callback error:', error);
    return NextResponse.redirect(new URL('/billing?error=processing_error', request.url));
  }
}
