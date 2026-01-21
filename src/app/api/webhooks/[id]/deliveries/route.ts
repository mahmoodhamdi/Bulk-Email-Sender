import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  getWebhook,
  listDeliveries,
  retryDelivery,
  listDeliveriesQuerySchema,
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
 * GET /api/webhooks/[id]/deliveries
 * List delivery history for a webhook
 * Requires authentication - users can only view deliveries for their own webhooks
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-deliveries-${context.userId}-${id}`);
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params_query = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status') || undefined,
      event: searchParams.get('event') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    // Validate parameters
    const validated = listDeliveriesQuerySchema.parse(params_query);

    // Get deliveries
    const { deliveries, total } = await listDeliveries({
      webhookId: id,
      status: validated.status,
      event: validated.event,
      startDate: validated.startDate,
      endDate: validated.endDate,
      page: validated.page,
      limit: validated.limit,
    });

    return NextResponse.json({
      data: deliveries,
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
    console.error('Error listing deliveries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'webhooks:read' });

/**
 * POST /api/webhooks/[id]/deliveries
 * Retry a failed delivery (requires deliveryId in body)
 * Requires authentication - users can only retry deliveries for their own webhooks
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`webhooks-retry-${context.userId}-${id}`);
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

    // Parse body
    const body = await request.json();
    const { deliveryId } = body;

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'deliveryId is required' },
        { status: 400 }
      );
    }

    // Verify the delivery belongs to this webhook
    const delivery = await prisma.webhookDelivery.findFirst({
      where: {
        id: deliveryId,
        webhookId: id,
      },
    });

    if (!delivery) {
      return createErrorResponse('Delivery not found', 404);
    }

    // Retry delivery
    const retriedDelivery = await retryDelivery(deliveryId);

    if (!retriedDelivery) {
      return createErrorResponse('Delivery not found', 404);
    }

    return NextResponse.json({
      data: retriedDelivery,
      message: 'Delivery retry queued successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('only retry failed')) {
      return NextResponse.json(
        { error: 'Can only retry failed deliveries' },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    console.error('Error retrying delivery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'webhooks:write' });
