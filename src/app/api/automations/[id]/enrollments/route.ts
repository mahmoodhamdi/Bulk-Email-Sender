import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  enrollContact,
  listEnrollments,
  enrollContactSchema,
} from '@/lib/automation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/automations/[id]/enrollments
 * List enrollments for an automation
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enrollments-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
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
  } catch (error) {
    console.error('Error listing enrollments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automations/[id]/enrollments
 * Enroll a contact in an automation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-enroll-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = enrollContactSchema.parse(body);

    // Enroll contact
    const enrollment = await enrollContact(id, validated.contactId, validated.startStepId);

    return NextResponse.json({ data: enrollment }, { status: 201 });
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
        'Automation not found': 404,
        'Can only enroll contacts in active automations': 400,
        'Contact is already enrolled in this automation': 409,
        'Automation has no steps': 400,
      };

      const status = errorMessages[error.message];
      if (status) {
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }
    console.error('Error enrolling contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
