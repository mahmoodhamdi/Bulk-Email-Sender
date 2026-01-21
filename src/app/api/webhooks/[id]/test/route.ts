import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { getWebhook, testWebhook } from '@/lib/webhook';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

interface RouteParams {
  id: string;
}

/**
 * Helper function to validate webhook ownership
 */
async function validateWebhookOwnership(webhookId: string, userId: string): Promise<boolean> {
  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      userId: userId,
    },
    select: { id: true },
  });
  return webhook !== null;
}

/**
 * POST /api/webhooks/[id]/test
 * Test webhook endpoint connectivity
 * Requires authentication - users can only test their own webhooks
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting (more strict for test endpoint)
    const rateLimitResult = apiRateLimiter.check(`webhooks-test-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Owner validation - check if webhook belongs to the user
    const isOwner = await validateWebhookOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('Webhook not found', 404);
    }

    // Check if webhook exists
    const webhook = await getWebhook(id);
    if (!webhook) {
      return createErrorResponse('Webhook not found', 404);
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
}, { requiredPermission: 'webhooks:write' });
