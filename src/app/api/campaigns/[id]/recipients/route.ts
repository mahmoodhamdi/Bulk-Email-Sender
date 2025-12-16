import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { campaignIdSchema } from '@/lib/validations/campaign';
import { apiRateLimiter } from '@/lib/rate-limit';
import { ZodError, z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Validation schema for cursor-based pagination
const recipientQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum([
    'PENDING', 'QUEUED', 'SENT', 'DELIVERED',
    'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED'
  ]).optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

/**
 * GET /api/campaigns/[id]/recipients
 * List recipients with cursor-based pagination
 *
 * Query parameters:
 * - cursor: The ID of the last item from the previous page (optional)
 * - limit: Number of items to return (default: 50, max: 100)
 * - status: Filter by recipient status (optional)
 * - direction: 'forward' (newer) or 'backward' (older) from cursor
 *
 * Response:
 * {
 *   data: Recipient[],
 *   pagination: {
 *     nextCursor: string | null,
 *     prevCursor: string | null,
 *     hasMore: boolean,
 *     total: number
 *   }
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`recipients-list-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate campaign ID
    campaignIdSchema.parse({ id });

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || '50',
      status: searchParams.get('status') || undefined,
      direction: searchParams.get('direction') || 'forward',
    };

    const validated = recipientQuerySchema.parse(queryParams);
    const { cursor, limit, status, direction } = validated;

    // Build where clause
    const where: Record<string, unknown> = {
      campaignId: id,
    };

    if (status) {
      where.status = status;
    }

    // Cursor-based pagination
    // Use ID as cursor since CUIDs are time-sortable
    const cursorCondition = cursor
      ? {
          id: direction === 'forward' ? { gt: cursor } : { lt: cursor },
        }
      : undefined;

    // Get total count for this filter
    const total = await prisma.recipient.count({ where });

    // Fetch recipients with cursor
    const recipients = await prisma.recipient.findMany({
      where: {
        ...where,
        ...cursorCondition,
      },
      take: limit + 1, // Fetch one extra to check if there's more
      orderBy: {
        id: direction === 'forward' ? 'asc' : 'desc',
      },
      select: {
        id: true,
        email: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        clickedAt: true,
        bouncedAt: true,
        bounceType: true,
        errorMessage: true,
        openCount: true,
        clickCount: true,
        trackingId: true,
        createdAt: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
      },
    });

    // Determine if there are more results
    const hasMore = recipients.length > limit;
    const items = hasMore ? recipients.slice(0, limit) : recipients;

    // For backward pagination, reverse the results to maintain consistent order
    if (direction === 'backward') {
      items.reverse();
    }

    // Calculate cursors
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].id
      : null;
    const prevCursor = cursor && items.length > 0
      ? items[0].id
      : null;

    return NextResponse.json({
      data: items,
      pagination: {
        nextCursor,
        prevCursor,
        hasMore,
        total,
        limit,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error listing recipients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
