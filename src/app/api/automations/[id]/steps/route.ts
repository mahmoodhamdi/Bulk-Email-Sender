import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  addStep,
  reorderSteps,
  createStepSchema,
} from '@/lib/automation';
import { withAuth, AuthContext } from '@/lib/auth';
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-response';

interface RouteParams {
  id: string;
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
 * POST /api/automations/[id]/steps
 * Add a step to an automation
 * Requires authentication - users can only add steps to their own automations
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-steps-${context.userId}-${id}`);
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
    const validated = createStepSchema.parse(body);

    // Add step
    const step = await addStep(id, validated);

    return apiSuccess(step, 201);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return ApiErrors.validationError({ fields: error.errors });
    }
    if (error instanceof SyntaxError) {
      return ApiErrors.invalidJson();
    }
    if (error instanceof Error) {
      if (error.message === 'Automation not found') {
        return ApiErrors.notFound('Automation');
      }
      if (error.message === 'Cannot add steps to an active automation') {
        return ApiErrors.invalidOperation(error.message);
      }
    }
    console.error('Error adding step:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:write' });

/**
 * PUT /api/automations/[id]/steps
 * Reorder steps in an automation
 * Requires authentication - users can only reorder steps in their own automations
 */
export const PUT = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-steps-reorder-${context.userId}-${id}`);
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
    const schema = z.object({
      stepIds: z.array(z.string()).min(1),
    });
    const validated = schema.parse(body);

    // Reorder steps
    const steps = await reorderSteps(id, validated.stepIds);

    return apiSuccess(steps);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return ApiErrors.validationError({ fields: error.errors });
    }
    if (error instanceof SyntaxError) {
      return ApiErrors.invalidJson();
    }
    if (error instanceof Error) {
      if (error.message === 'Automation not found') {
        return ApiErrors.notFound('Automation');
      }
      if (error.message === 'Cannot reorder steps of an active automation') {
        return ApiErrors.invalidOperation(error.message);
      }
    }
    console.error('Error reordering steps:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:write' });
