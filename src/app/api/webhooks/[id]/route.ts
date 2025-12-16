import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { validateWebhookUrl } from '@/lib/ssrf-protection';
import {
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getDeliveryStats,
  updateWebhookSchema,
} from '@/lib/webhook';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/webhooks/[id]
 * Get webhook details including recent statistics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-get-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Get webhook
    const webhook = await getWebhook(id);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
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
}

/**
 * PATCH /api/webhooks/[id]
 * Update webhook configuration
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-update-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Check if webhook exists
    const existingWebhook = await getWebhook(id);
    if (!existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
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
}

/**
 * DELETE /api/webhooks/[id]
 * Delete a webhook and all its delivery history
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-delete-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Check if webhook exists
    const existingWebhook = await getWebhook(id);
    if (!existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
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
}
