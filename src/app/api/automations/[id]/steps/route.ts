import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  addStep,
  reorderSteps,
  createStepSchema,
} from '@/lib/automation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/automations/[id]/steps
 * Add a step to an automation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-steps-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
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
}

/**
 * PUT /api/automations/[id]/steps
 * Reorder steps in an automation
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-steps-reorder-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
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
}
