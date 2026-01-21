import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  createABTest,
  listABTests,
  createABTestSchema,
} from '@/lib/ab-test';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

/**
 * GET /api/ab-tests
 * List A/B tests with pagination and filtering
 * Requires authentication - users can only see their own A/B tests
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-list-${context.userId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const status = searchParams.get('status') as 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | null;

    // Filter by userId for owner validation
    const { tests, total } = await listABTests({
      userId: context.userId, // Owner filter - users can only see their own tests
      status: status || undefined,
      page,
      limit,
    });

    return NextResponse.json({
      data: tests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error listing A/B tests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'ab-tests:read' });

/**
 * POST /api/ab-tests
 * Create a new A/B test
 * Requires authentication - test is associated with the authenticated user
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-create-${context.userId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = createABTestSchema.parse(body);

    // Verify the campaign belongs to the user before creating the test
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: validated.campaignId,
        userId: context.userId, // Owner validation
      },
      select: { id: true },
    });

    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }

    // Create A/B test - associate with authenticated user
    const abTest = await createABTest(validated, context.userId);

    return NextResponse.json({ data: abTest }, { status: 201 });
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
    if (error instanceof Error) {
      if (error.message === 'Campaign not found') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Campaign already has an A/B test') {
        return NextResponse.json(
          { error: 'Campaign already has an A/B test' },
          { status: 409 }
        );
      }
    }
    console.error('Error creating A/B test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'ab-tests:write' });
