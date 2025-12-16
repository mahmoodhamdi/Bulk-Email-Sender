import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  getEnrollment,
  exitEnrollment,
} from '@/lib/automation';

interface RouteParams {
  params: Promise<{ id: string; enrollmentId: string }>;
}

/**
 * GET /api/automations/[id]/enrollments/[enrollmentId]
 * Get enrollment details with step executions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { enrollmentId } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollment-get-${enrollmentId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: enrollment });
  } catch (error) {
    console.error('Error getting enrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/automations/[id]/enrollments/[enrollmentId]
 * Exit an enrollment
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { enrollmentId } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollment-update-${enrollmentId}`);
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
  } catch (error) {
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
}
