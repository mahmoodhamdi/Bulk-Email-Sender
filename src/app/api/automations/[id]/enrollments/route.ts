import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  enrollContact,
  listEnrollments,
  enrollContactSchema,
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
 * GET /api/automations/[id]/enrollments
 * List enrollments for an automation
 * Requires authentication - users can only view enrollments for their own automations
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollments-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const status = searchParams.get('status') as 'ACTIVE' | 'COMPLETED' | 'EXITED' | 'FAILED' | null;

    const { enrollments, total } = await listEnrollments(id, {
      status: status || undefined,
      page,
      limit,
    });

    return NextResponse.json({
      data: enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error listing enrollments:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:read' });

/**
 * POST /api/automations/[id]/enrollments
 * Enroll a contact in an automation
 * Requires authentication - users can only enroll contacts in their own automations
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return apiError('VALIDATION_ERROR', 'ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enroll-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return ApiErrors.rateLimited(retryAfter);
    }

    // Owner validation - check if automation belongs to the user
    const isOwner = await validateAutomationOwnership(id, context.userId);
    if (!isOwner) {
      return ApiErrors.notFound('Automation');
    }

    // Validate that the contact also belongs to the user
    const body = await request.json();
    const validated = enrollContactSchema.parse(body);

    const contact = await prisma.contact.findFirst({
      where: {
        id: validated.contactId,
        userId: context.userId, // Owner validation for contact
      },
      select: { id: true },
    });

    if (!contact) {
      return ApiErrors.notFound('Contact');
    }

    // Enroll contact
    const enrollment = await enrollContact(id, validated.contactId, validated.startStepId);

    return apiSuccess(enrollment, 201);
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
      if (error.message === 'Contact is already enrolled in this automation') {
        return ApiErrors.conflict(error.message);
      }
      if (
        error.message === 'Can only enroll contacts in active automations' ||
        error.message === 'Automation has no steps'
      ) {
        return ApiErrors.invalidOperation(error.message);
      }
    }
    console.error('Error enrolling contact:', error);
    return ApiErrors.internalError();
  }
}, { requiredPermission: 'automations:write' });
