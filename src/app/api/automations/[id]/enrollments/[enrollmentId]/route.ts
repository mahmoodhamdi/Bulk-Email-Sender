import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  getEnrollment,
  exitEnrollment,
} from '@/lib/automation';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

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
      return createErrorResponse('ID is required', 400);
    }
    if (!params?.enrollmentId) {
      return createErrorResponse('Enrollment ID is required', 400);
    }
    const { id, enrollmentId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollment-get-${context.userId}-${enrollmentId}`);
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

    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) {
      return createErrorResponse('Enrollment not found', 404);
    }

    // Verify the enrollment belongs to the specified automation
    if (enrollment.automationId !== id) {
      return createErrorResponse('Enrollment not found', 404);
    }

    return NextResponse.json({ data: enrollment });
  } catch (error: unknown) {
    console.error('Error getting enrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return createErrorResponse('ID is required', 400);
    }
    if (!params?.enrollmentId) {
      return createErrorResponse('Enrollment ID is required', 400);
    }
    const { id, enrollmentId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollment-update-${context.userId}-${enrollmentId}`);
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

    // Verify the enrollment exists and belongs to the specified automation
    const existingEnrollment = await getEnrollment(enrollmentId);
    if (!existingEnrollment || existingEnrollment.automationId !== id) {
      return createErrorResponse('Enrollment not found', 404);
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
      return NextResponse.json({ data: enrollment });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
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
        'Enrollment not found': 404,
        'Enrollment is not active': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error updating enrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'automations:write' });
