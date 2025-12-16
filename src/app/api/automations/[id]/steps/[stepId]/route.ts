import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  updateStep,
  removeStep,
  updateStepSchema,
} from '@/lib/automation';

interface RouteParams {
  params: Promise<{ id: string; stepId: string }>;
}

/**
 * PATCH /api/automations/[id]/steps/[stepId]
 * Update a step
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { stepId } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-step-update-${stepId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateStepSchema.parse(body);

    // Update step
    const step = await updateStep(stepId, validated);

    return NextResponse.json({ data: step });
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
    if (error instanceof Error) {
      const errorMessages: Record<string, number> = {
        'Step not found': 404,
        'Cannot update steps of an active automation': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error updating step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/automations/[id]/steps/[stepId]
 * Remove a step from an automation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { stepId } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-step-delete-${stepId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    await removeStep(stepId);

    return NextResponse.json(
      { message: 'Step removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      const errorMessages: Record<string, number> = {
        'Step not found': 404,
        'Cannot remove steps from an active automation': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error removing step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
