import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter } from '@/lib/rate-limit';
import { getWebhook, testWebhook } from '@/lib/webhook';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/webhooks/[id]/test
 * Test webhook endpoint connectivity
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting (more strict for test endpoint)
    const rateLimitResult = apiRateLimiter.check(`webhooks-test-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Check if webhook exists
    const webhook = await getWebhook(id);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Test webhook
    const result = await testWebhook(id);

    return NextResponse.json({
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error testing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
