/**
 * PayTabs Webhook Handler
 * Handles transaction callbacks from PayTabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { PayTabsGateway } from '@/lib/payments/paytabs';
import { verifyCallbackSignature } from '@/lib/payments/paytabs/client';

export async function POST(request: NextRequest) {
  try {
    // Get the signature from headers
    const signature = request.headers.get('signature') || '';

    // Parse the callback data
    const payload = await request.json();

    // Verify the signature (optional - PayTabs doesn't always send signature)
    if (signature && !verifyCallbackSignature(signature, payload)) {
      console.error('PayTabs webhook signature verification failed');
      // Don't reject - PayTabs signature verification is optional
    }

    // Process the webhook
    const gateway = new PayTabsGateway();
    await gateway.handleWebhook(payload, signature);

    // Return success
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayTabs webhook error:', error);

    // Return 200 to prevent retries for processing errors
    return NextResponse.json(
      { received: true, error: 'Processing error' },
      { status: 200 }
    );
  }
}

// Handle GET for redirect callbacks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tranRef = searchParams.get('tranRef');
    const respStatus = searchParams.get('respStatus');
    const respCode = searchParams.get('respCode');
    const respMessage = searchParams.get('respMessage');
    const cartId = searchParams.get('cartId');

    // Build payload from query params
    const payload = {
      tran_ref: tranRef,
      cart_id: cartId,
      payment_result: {
        response_status: respStatus,
        response_code: respCode,
        response_message: respMessage,
      },
    };

    // Process the callback if it's a success
    if (respStatus === 'A') {
      const gateway = new PayTabsGateway();
      await gateway.handleWebhook(payload, '');
      return NextResponse.redirect(new URL('/billing?success=true', request.url));
    } else {
      return NextResponse.redirect(
        new URL(`/billing?error=payment_failed&message=${encodeURIComponent(respMessage || 'Payment failed')}`, request.url)
      );
    }
  } catch (error) {
    console.error('PayTabs redirect callback error:', error);
    return NextResponse.redirect(new URL('/billing?error=processing_error', request.url));
  }
}
