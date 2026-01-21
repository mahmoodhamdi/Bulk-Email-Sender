import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { validateWebhookUrl } from '@/lib/ssrf-protection';
import {
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getDeliveryStats,
  updateWebhookSchema,
} from '@/lib/webhook';
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
 * GET /api/webhooks/[id]
 * Get webhook details including recent statistics
 * Requires authentication - users can only access their own webhooks
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-get-${context.userId}-${id}`);
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

    // Get webhook
    const webhook = await getWebhook(id);
    if (!webhook) {
      return createErrorResponse('Webhook not found', 404);
    }

    // Get delivery statistics
    const stats = await getDeliveryStats(id, 'week');

    // Remove sensitive fields from response
    const sanitizedWebhook = {
      ...webhook,
      secret: webhook.secret ? '••••••••' : null,
      authValue: webhook.authValue ? '••••••••' : null,
    };

    return NextResponse.json({
      data: {
        ...sanitizedWebhook,
        stats,
      },
    });
  } catch (error: unknown) {
    console.error('Error getting webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'webhooks:read' });

/**
 * PATCH /api/webhooks/[id]
 * Update webhook configuration
 * Requires authentication - users can only update their own webhooks
 */
export const PATCH = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-update-${context.userId}-${id}`);
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
    const existingWebhook = await getWebhook(id);
    if (!existingWebhook) {
      return createErrorResponse('Webhook not found', 404);
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateWebhookSchema.parse(body);

    // SSRF Protection: Validate the webhook URL if it's being updated
    if (validated.url) {
      const ssrfValidation = await validateWebhookUrl(validated.url);
      if (!ssrfValidation.safe) {
        return NextResponse.json(
          {
            error: 'Invalid webhook URL',
            details: ssrfValidation.reason || 'URL blocked for security reasons',
          },
          { status: 400 }
        );
      }
    }

    // Update webhook
    const webhook = await updateWebhook(id, validated);

    // Remove sensitive fields from response
    const sanitizedWebhook = {
      ...webhook,
      secret: webhook.secret ? '••••••••' : null,
      authValue: webhook.authValue ? '••••••••' : null,
    };

    return NextResponse.json({ data: sanitizedWebhook });
  } catch (error: unknown) {
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
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'A webhook with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'webhooks:write' });

/**
 * DELETE /api/webhooks/[id]
 * Delete a webhook and all its delivery history
 * Requires authentication - users can only delete their own webhooks
 */
export const DELETE = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-delete-${context.userId}-${id}`);
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
    const existingWebhook = await getWebhook(id);
    if (!existingWebhook) {
      return createErrorResponse('Webhook not found', 404);
    }

    // Delete webhook (cascades to deliveries)
    await deleteWebhook(id);

    return NextResponse.json(
      { message: 'Webhook deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'webhooks:delete' });
