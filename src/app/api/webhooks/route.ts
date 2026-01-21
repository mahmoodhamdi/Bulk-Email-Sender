import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { validateWebhookUrl } from '@/lib/ssrf-protection';
import {
  createWebhook,
  listWebhooks,
  createWebhookSchema,
  listWebhooksQuerySchema,
} from '@/lib/webhook';
import { withAuth, AuthContext } from '@/lib/auth';

/**
 * GET /api/webhooks
 * List webhooks with pagination and filtering
 * Requires authentication - users can only see their own webhooks
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-list-${context.userId}`);
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

    // Get webhooks - filter by userId for owner validation
    const { webhooks, total } = await listWebhooks({
      userId: context.userId, // Owner filter - users can only see their own webhooks
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
  } catch (error: unknown) {
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
}, { requiredPermission: 'webhooks:read' });

/**
 * POST /api/webhooks
 * Create a new webhook
 * Requires authentication - webhook is associated with the authenticated user
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-create-${context.userId}`);
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

    // SSRF Protection: Validate the webhook URL
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

    // Create webhook - associate with authenticated user
    const webhook = await createWebhook({
      name: validated.name,
      url: validated.url,
      events: validated.events,
      userId: context.userId, // Associate with authenticated user
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
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'webhooks:write' });
