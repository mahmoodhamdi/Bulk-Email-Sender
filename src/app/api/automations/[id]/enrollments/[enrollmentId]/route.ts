import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  getEnrollment,
  exitEnrollment,
} from '@/lib/automation';
import { withAuth, AuthContext } from '@/lib/auth';
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-response';

interface RouteParams {
  id: string;
  enrollmentId: string;
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
 * GET /api/automations/[id]/enrollments/[enrollmentId]
 * Get enrollment details with step executions
 * Requires authentication - users can only view enrollments for their own automations
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    if (!params?.enrollmentId) {
      return apiError('VALIDATION_ERROR', 'Enrollment ID is required', 400);
    }
    const { id, enrollmentId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollment-get-${context.userId}-${enrollmentId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) {
      return ApiErrors.notFound('Enrollment');
    }

    // Verify the enrollment belongs to the specified automation
    if (enrollment.automationId !== id) {
      return ApiErrors.notFound('Enrollment');
    }

    return apiSuccess(enrollment);
  } catch (error: unknown) {
    console.error('Error getting enrollment:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:read' });

/**
 * PATCH /api/automations/[id]/enrollments/[enrollmentId]
 * Exit an enrollment
 * Requires authentication - users can only exit enrollments for their own automations
 */
export const PATCH = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    if (!params?.enrollmentId) {
      return apiError('VALIDATION_ERROR', 'Enrollment ID is required', 400);
    }
    const { id, enrollmentId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollment-update-${context.userId}-${enrollmentId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    // Verify the enrollment exists and belongs to the specified automation
    const existingEnrollment = await getEnrollment(enrollmentId);
    if (!existingEnrollment || existingEnrollment.automationId !== id) {
      return ApiErrors.notFound('Enrollment');
    }

    // Parse and validate body
    const body = await request.json();
    const schema = z.object({
      action: z.literal('exit'),
      reason: z.string().max(500).optional(),
    });
    const validated = schema.parse(body);

    if (validated.action === 'exit') {
      const enrollment = await exitEnrollment(enrollmentId, validated.reason);
      return apiSuccess(enrollment);
    }

    return ApiErrors.invalidOperation('Invalid action');
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return ApiErrors.validationError({ fields: error.errors });
    }
    if (error instanceof SyntaxError) {
      return ApiErrors.invalidJson();
    }
    if (error instanceof Error) {
      if (error.message === 'Enrollment not found') {
        return ApiErrors.notFound('Enrollment');
      }
      if (error.message === 'Enrollment is not active') {
        return ApiErrors.invalidOperation(error.message);
      }
    }
    console.error('Error updating enrollment:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:write' });
