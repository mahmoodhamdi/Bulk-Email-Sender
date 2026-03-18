import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  getAutomation,
  updateAutomation,
  deleteAutomation,
  activateAutomation,
  pauseAutomation,
  archiveAutomation,
  updateAutomationSchema,
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
 * GET /api/automations/[id]
 * Get automation details with stats
 * Requires authentication - users can only access their own automations
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-get-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    const automation = await getAutomation(id);
    if (!automation) {
      return ApiErrors.notFound('Automation');
    }

    return apiSuccess(automation);
  } catch (error: unknown) {
    console.error('Error getting automation:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:read' });

/**
 * PATCH /api/automations/[id]
 * Update automation or perform actions (activate, pause, archive)
 * Requires authentication - users can only update their own automations
 */
export const PATCH = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-update-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Handle different actions
    switch (action) {
      case 'activate': {
        const result = await activateAutomation(id);
        return apiSuccess(result);
      }

      case 'pause': {
        const result = await pauseAutomation(id);
        return apiSuccess(result);
      }

      case 'archive': {
        const result = await archiveAutomation(id);
        return apiSuccess(result);
      }

      default: {
        // Default: update automation settings
        const validated = updateAutomationSchema.parse(data);
        const result = await updateAutomation(id, validated);
        return apiSuccess(result);
      }
    }
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return ApiErrors.validationError({ fields: error.errors });
    }
    if (error instanceof SyntaxError) {
      return ApiErrors.invalidJson();
    }
    if (error instanceof Error) {
      const notFoundMessages = ['Automation not found'];
      if (notFoundMessages.includes(error.message)) {
        return ApiErrors.notFound('Automation');
      }

      const invalidOperationMessages = [
        'Cannot update an active automation. Pause it first.',
        'Automation is already active',
        'Automation must have at least one step',
        'Can only pause active automations',
        'Automation is already archived',
      ];
      if (invalidOperationMessages.includes(error.message)) {
        return ApiErrors.invalidOperation(error.message);
      }
    }
    console.error('Error updating automation:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:write' });

/**
 * DELETE /api/automations/[id]
 * Delete an automation
 * Requires authentication - users can only delete their own automations
 */
export const DELETE = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-delete-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    await deleteAutomation(id);

    return NextResponse.json(
      { message: 'Automation deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Automation not found') {
      return ApiErrors.notFound('Automation');
    }
    console.error('Error deleting automation:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:delete' });
