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
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

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
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-get-${context.userId}-${id}`);
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

    const automation = await getAutomation(id);
    if (!automation) {
      return createErrorResponse('Automation not found', 404);
    }

    return NextResponse.json({ data: automation });
  } catch (error: unknown) {
    console.error('Error getting automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-update-${context.userId}-${id}`);
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

    const body = await request.json();
    const { action, ...data } = body;

    // Handle different actions
    switch (action) {
      case 'activate': {
        const result = await activateAutomation(id);
        return NextResponse.json({ data: result });
      }

      case 'pause': {
        const result = await pauseAutomation(id);
        return NextResponse.json({ data: result });
      }

      case 'archive': {
        const result = await archiveAutomation(id);
        return NextResponse.json({ data: result });
      }

      default: {
        // Default: update automation settings
        const validated = updateAutomationSchema.parse(data);
        const result = await updateAutomation(id, validated);
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
        'Automation not found': 404,
        'Cannot update an active automation. Pause it first.': 400,
        'Automation is already active': 400,
        'Automation must have at least one step': 400,
        'Can only pause active automations': 400,
        'Automation is already archived': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error updating automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-delete-${context.userId}-${id}`);
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

    await deleteAutomation(id);

    return NextResponse.json(
      { message: 'Automation deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Automation not found') {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }
    console.error('Error deleting automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'automations:delete' });
