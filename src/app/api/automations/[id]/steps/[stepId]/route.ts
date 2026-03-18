import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  updateStep,
  removeStep,
  updateStepSchema,
} from '@/lib/automation';
import { withAuth, AuthContext } from '@/lib/auth';
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-response';

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
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    if (!params?.stepId) {
      return apiError('VALIDATION_ERROR', 'Step ID is required', 400);
    }
    const { id, stepId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-step-update-${context.userId}-${stepId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateStepSchema.parse(body);

    // Update step
    const step = await updateStep(stepId, validated);

    return apiSuccess(step);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return ApiErrors.validationError({ fields: error.errors });
    }
    if (error instanceof SyntaxError) {
      return ApiErrors.invalidJson();
    }
    if (error instanceof Error) {
      if (error.message === 'Step not found') {
        return ApiErrors.notFound('Step');
      }
      if (error.message === 'Cannot update steps of an active automation') {
        return ApiErrors.invalidOperation(error.message);
      }
    }
    console.error('Error updating step:', error);
    return ApiErrors.internalError();
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
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    if (!params?.stepId) {
      return apiError('VALIDATION_ERROR', 'Step ID is required', 400);
    }
    const { id, stepId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-step-delete-${context.userId}-${stepId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    await removeStep(stepId);

    return NextResponse.json(
      { message: 'Step removed successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Step not found') {
        return ApiErrors.notFound('Step');
      }
      if (error.message === 'Cannot remove steps from an active automation') {
        return ApiErrors.invalidOperation(error.message);
      }
    }
    console.error('Error removing step:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:delete' });
