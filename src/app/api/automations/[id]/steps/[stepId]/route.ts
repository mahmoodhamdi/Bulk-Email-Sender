import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  updateStep,
  removeStep,
  updateStepSchema,
} from '@/lib/automation';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

interface RouteParams {
  id: string;
  stepId: string;
}

/**
 * Helper function to validate automation ownership
 */
async function validateAutomationOwnership(automationId: string, userId: string): Promise<boolean> {
  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      userId: userId,
    },
    select: { id: true },
  });
  return automation !== null;
}

/**
 * PATCH /api/automations/[id]/steps/[stepId]
 * Update a step
 * Requires authentication - users can only update steps in their own automations
 */
export const PATCH = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    if (!params?.stepId) {
      return createErrorResponse('Step ID is required', 400);
    }
    const { id, stepId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-step-update-${context.userId}-${stepId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('Automation not found', 404);
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateStepSchema.parse(body);

    // Update step
    const step = await updateStep(stepId, validated);

    return NextResponse.json({ data: step });
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
}, { requiredPermission: 'automations:write' });

/**
 * DELETE /api/automations/[id]/steps/[stepId]
 * Remove a step from an automation
 * Requires authentication - users can only remove steps from their own automations
 */
export const DELETE = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    if (!params?.stepId) {
      return createErrorResponse('Step ID is required', 400);
    }
    const { id, stepId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-step-delete-${context.userId}-${stepId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('Automation not found', 404);
    }

    await removeStep(stepId);

    return NextResponse.json(
      { message: 'Step removed successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
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
}, { requiredPermission: 'automations:delete' });
