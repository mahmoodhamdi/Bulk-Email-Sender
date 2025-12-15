import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { listEventsSchema } from '@/lib/validations/tracking';
import { apiRateLimiter } from '@/lib/rate-limit';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tracking/events
 * List email events with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('tracking-events-list');
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
      campaignId: searchParams.get('campaignId') || undefined,
      recipientId: searchParams.get('recipientId') || undefined,
      type: searchParams.get('type') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    // Validate parameters
    const validated = listEventsSchema.parse(params);
    const { page, limit, campaignId, recipientId, type, startDate, endDate, sortBy, sortOrder } = validated;

    // Build where clause
    const where: Prisma.EmailEventWhereInput = {};
    if (campaignId) {
      where.campaignId = campaignId;
    }
    if (recipientId) {
      where.recipientId = recipientId;
    }
    if (type) {
      where.type = type;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await prisma.emailEvent.count({ where });

    // Get events
    const events = await prisma.emailEvent.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        campaign: {
          select: { id: true, name: true },
        },
        recipient: {
          select: { id: true, email: true },
        },
      },
    });

    return NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error listing events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
