import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  getABTest,
  updateABTest,
  deleteABTest,
  startABTest,
  selectWinner,
  autoSelectWinner,
  cancelABTest,
  addVariant,
  updateVariant,
  removeVariant,
  updateABTestSchema,
  addVariantSchema,
  updateVariantSchema,
} from '@/lib/ab-test';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

interface RouteParams {
  id: string;
}

/**
 * Helper function to validate A/B test ownership
 */
async function validateABTestOwnership(testId: string, userId: string): Promise<boolean> {
  const test = await prisma.aBTest.findFirst({
    where: {
      id: testId,
      userId: userId,
    },
    select: { id: true },
  });
  return test !== null;
}

/**
 * GET /api/ab-tests/[id]
 * Get A/B test details with stats
 * Requires authentication - users can only access their own tests
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-get-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Owner validation - check if test belongs to the user
    const isOwner = await validateABTestOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('A/B test not found', 404);
    }

    const abTest = await getABTest(id);
    if (!abTest) {
      return createErrorResponse('A/B test not found', 404);
    }

    return NextResponse.json({ data: abTest });
  } catch (error: unknown) {
    console.error('Error getting A/B test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'ab-tests:read' });

/**
 * PATCH /api/ab-tests/[id]
 * Update A/B test or perform actions (start, select-winner, cancel, add-variant, etc.)
 * Requires authentication - users can only update their own tests
 */
export const PATCH = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-update-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Owner validation - check if test belongs to the user
    const isOwner = await validateABTestOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('A/B test not found', 404);
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Handle different actions
    switch (action) {
      case 'start': {
        const result = await startABTest(id);
        return NextResponse.json({ data: result });
      }

      case 'select-winner': {
        if (!data.variantId) {
          return NextResponse.json(
            { error: 'variantId is required for selecting winner' },
            { status: 400 }
          );
        }
        const result = await selectWinner(id, data.variantId);
        return NextResponse.json({ data: result });
      }

      case 'auto-select-winner': {
        const result = await autoSelectWinner(id);
        return NextResponse.json({ data: result });
      }

      case 'cancel': {
        const result = await cancelABTest(id);
        return NextResponse.json({ data: result });
      }

      case 'add-variant': {
        const validated = addVariantSchema.parse(data);
        const variant = await addVariant(id, validated);
        return NextResponse.json({ data: variant }, { status: 201 });
      }

      case 'update-variant': {
        if (!data.variantId) {
          return NextResponse.json(
            { error: 'variantId is required for updating variant' },
            { status: 400 }
          );
        }
        const validated = updateVariantSchema.parse(data);
        const variant = await updateVariant(data.variantId, validated);
        return NextResponse.json({ data: variant });
      }

      case 'remove-variant': {
        if (!data.variantId) {
          return NextResponse.json(
            { error: 'variantId is required for removing variant' },
            { status: 400 }
          );
        }
        await removeVariant(data.variantId);
        return NextResponse.json({ message: 'Variant removed successfully' });
      }

      default: {
        // Default: update test settings
        const validated = updateABTestSchema.parse(data);
        const result = await updateABTest(id, validated);
        return NextResponse.json({ data: result });
      }
    }
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
      const errorMessages: Record<string, number> = {
        'A/B test not found': 404,
        'Variant not found': 404,
        'Cannot update a test that is not in draft status': 400,
        'Cannot add variants to a test that is not in draft status': 400,
        'Cannot update variants of a test that is not in draft status': 400,
        'Cannot remove variants from a test that is not in draft status': 400,
        'Test is not in draft status': 400,
        'At least 2 variants are required to start a test': 400,
        'Can only select winner for running tests': 400,
        'Can only auto-select winner for running tests': 400,
        'Test is already completed or cancelled': 400,
        'Variant not found in this test': 400,
        'Maximum 5 variants allowed': 400,
        'Minimum 2 variants are required': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error updating A/B test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'ab-tests:write' });

/**
 * DELETE /api/ab-tests/[id]
 * Delete an A/B test
 * Requires authentication - users can only delete their own tests
 */
export const DELETE = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-delete-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Owner validation - check if test belongs to the user
    const isOwner = await validateABTestOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('A/B test not found', 404);
    }

    await deleteABTest(id);

    return NextResponse.json(
      { message: 'A/B test deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'A/B test not found') {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }
    console.error('Error deleting A/B test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'ab-tests:delete' });
