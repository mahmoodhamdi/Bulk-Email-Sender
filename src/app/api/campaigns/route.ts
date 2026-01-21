import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createCampaignSchema, listCampaignsSchema } from '@/lib/validations/campaign';
import { apiRateLimiter } from '@/lib/rate-limit';
import { sanitizeEmailHtml } from '@/lib/sanitize-server';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';
import { ZodError } from 'zod';

/**
 * GET /api/campaigns
 * List campaigns with pagination and filtering
 * Requires authentication - users can only see their own campaigns
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`campaigns-list-${context.userId}`);
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
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    // Validate parameters
    const validated = listCampaignsSchema.parse(params);
    const { page, limit, status, search, sortBy, sortOrder } = validated;

    // Build where clause - ALWAYS filter by userId for security
    const where: Record<string, unknown> = {
      userId: context.userId, // Owner filter - users can only see their own campaigns
    };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.campaign.count({ where });

    // Get campaigns
    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        template: {
          select: { id: true, name: true },
        },
        _count: {
          select: { recipients: true, events: true },
        },
      },
    });

    return NextResponse.json({
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error listing campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'campaigns:read' });

/**
 * POST /api/campaigns
 * Create a new campaign
 * Requires authentication - campaign is associated with the authenticated user
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`campaigns-create-${context.userId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    // Sanitize HTML content to prevent XSS attacks (preserves merge tags)
    const sanitizedContent = sanitizeEmailHtml(validated.content);

    // Create campaign - associate with authenticated user
    const campaign = await prisma.campaign.create({
      data: {
        name: validated.name,
        subject: validated.subject,
        fromName: validated.fromName,
        fromEmail: validated.fromEmail,
        replyTo: validated.replyTo,
        content: sanitizedContent,
        contentType: validated.contentType,
        templateId: validated.templateId,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
        status: validated.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        userId: context.userId, // Associate with authenticated user
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
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
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'campaigns:write' });
