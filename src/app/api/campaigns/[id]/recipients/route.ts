import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { campaignIdSchema, addRecipientsSchema } from '@/lib/validations/campaign';
import { apiRateLimiter } from '@/lib/rate-limit';
import { generateShortId } from '@/lib/crypto';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';
import { ZodError, z } from 'zod';

interface RouteParams {
  id: string;
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
 * Requires authentication - users can only access their own campaign recipients
 *
 * Query parameters:
 * - cursor: The ID of the last item from the previous page (optional)
 * - limit: Number of items to return (default: 50, max: 100)
 * - status: Filter by recipient status (optional)
 * - direction: 'forward' (newer) or 'backward' (older) from cursor
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('Campaign ID is required', 400);
    }

    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`recipients-list-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate campaign ID
    campaignIdSchema.parse({ id });

    // Verify campaign exists AND belongs to the user (owner validation)
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: context.userId, // Owner validation
      },
      select: { id: true },
    });

    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
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
  } catch (error: unknown) {
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
}, { requiredPermission: 'campaigns:read' });

/**
 * POST /api/campaigns/[id]/recipients
 * Add recipients to a campaign
 * Requires authentication - users can only add recipients to their own campaigns
 *
 * Request body:
 * {
 *   emails: string[],    // Array of email addresses
 *   listIds?: string[]   // Optional: Import from contact lists
 * }
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('Campaign ID is required', 400);
    }

    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`recipients-add-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate campaign ID
    campaignIdSchema.parse({ id });

    // Verify campaign exists, belongs to the user, and is in DRAFT status (owner validation)
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: context.userId, // Owner validation
      },
      select: { id: true, status: true },
    });

    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return createErrorResponse('Can only add recipients to draft or scheduled campaigns', 400);
    }

    // Parse and validate body
    const body = await request.json();
    const validated = addRecipientsSchema.parse(body);

    const { emails, listIds } = validated;

    // Collect all emails to add
    let allEmails = [...emails];

    // If listIds provided, get emails from contact lists (only user's own lists)
    if (listIds && listIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: {
          userId: context.userId, // Only user's own contacts
          status: 'ACTIVE',
          listMembers: {
            some: {
              listId: { in: listIds },
              list: {
                userId: context.userId, // Only user's own lists
              },
            },
          },
        },
        select: { email: true },
      });
      allEmails = [...allEmails, ...contacts.map(c => c.email)];
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(allEmails.map(e => e.toLowerCase()))];

    // Get existing recipient emails for this campaign
    const existingRecipients = await prisma.recipient.findMany({
      where: { campaignId: id },
      select: { email: true },
    });
    const existingEmails = new Set(existingRecipients.map(r => r.email.toLowerCase()));

    // Filter out already existing recipients
    const newEmails = uniqueEmails.filter(email => !existingEmails.has(email));

    if (newEmails.length === 0) {
      return NextResponse.json({
        data: {
          added: 0,
          skipped: uniqueEmails.length,
          total: existingRecipients.length,
        },
        message: 'All recipients already exist',
      });
    }

    // Create recipient records
    const recipientData = newEmails.map(email => ({
      campaignId: id,
      email,
      status: 'PENDING' as const,
      trackingId: generateShortId(16),
    }));

    // Use createMany for bulk insert
    const result = await prisma.recipient.createMany({
      data: recipientData,
      skipDuplicates: true,
    });

    // Get updated total count
    const totalRecipients = await prisma.recipient.count({
      where: { campaignId: id },
    });

    return NextResponse.json({
      data: {
        added: result.count,
        skipped: uniqueEmails.length - newEmails.length,
        total: totalRecipients,
      },
    }, { status: 201 });
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
    console.error('Error adding recipients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'campaigns:write' });
