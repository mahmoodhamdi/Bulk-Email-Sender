import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import {
  addStep,
  reorderSteps,
  createStepSchema,
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
 * POST /api/automations/[id]/steps
 * Add a step to an automation
 * Requires authentication - users can only add steps to their own automations
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-steps-${context.userId}-${id}`);
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
    const validated = createStepSchema.parse(body);

    // Add step
    const step = await addStep(id, validated);

    return NextResponse.json({ data: step }, { status: 201 });
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
        'Cannot add steps to an active automation': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error adding step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-steps-reorder-${context.userId}-${id}`);
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
    const schema = z.object({
      stepIds: z.array(z.string()).min(1),
    });
    const validated = schema.parse(body);

    // Reorder steps
    const steps = await reorderSteps(id, validated.stepIds);

    return NextResponse.json({ data: steps });
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
        'Cannot reorder steps of an active automation': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error reordering steps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'automations:write' });
