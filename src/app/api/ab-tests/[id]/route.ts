import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ab-tests/[id]
 * Get A/B test details with stats
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-get-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    const abTest = await getABTest(id);
    if (!abTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: abTest });
  } catch (error: unknown) {
    console.error('Error getting A/B test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ab-tests/[id]
 * Update A/B test or perform actions (start, select-winner, cancel, add-variant, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-update-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
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
}

/**
 * DELETE /api/ab-tests/[id]
 * Delete an A/B test
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`ab-tests-delete-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
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
}
