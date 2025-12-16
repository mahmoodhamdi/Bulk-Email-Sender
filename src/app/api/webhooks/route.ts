import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  createWebhook,
  listWebhooks,
  createWebhookSchema,
  listWebhooksQuerySchema,
} from '@/lib/webhook';

/**
 * GET /api/webhooks
 * List webhooks with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('webhooks-list');
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      isActive: searchParams.get('isActive') || undefined,
      event: searchParams.get('event') || undefined,
    };

    // Validate parameters
    const validated = listWebhooksQuerySchema.parse(params);

    // Get webhooks
    const { webhooks, total } = await listWebhooks({
      isActive: validated.isActive,
      event: validated.event,
      page: validated.page,
      limit: validated.limit,
    });

    // Remove sensitive fields from response
    const sanitizedWebhooks = webhooks.map((webhook) => ({
      ...webhook,
      secret: webhook.secret ? '••••••••' : null,
      authValue: webhook.authValue ? '••••••••' : null,
    }));

    return NextResponse.json({
      data: sanitizedWebhooks,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('webhooks-create');
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = createWebhookSchema.parse(body);

    // Create webhook
    const webhook = await createWebhook({
      name: validated.name,
      url: validated.url,
      events: validated.events,
      secret: validated.secret,
      authType: validated.authType,
      authHeader: validated.authHeader,
      authValue: validated.authValue,
      timeout: validated.timeout,
      maxRetries: validated.maxRetries,
      campaignIds: validated.campaignIds,
      contactListIds: validated.contactListIds,
      isActive: validated.isActive,
    });

    // Remove sensitive fields from response
    const sanitizedWebhook = {
      ...webhook,
      secret: webhook.secret ? '••••••••' : null,
      authValue: webhook.authValue ? '••••••••' : null,
    };

    return NextResponse.json({ data: sanitizedWebhook }, { status: 201 });
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
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
