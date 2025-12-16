import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  createAutomation,
  listAutomations,
  createAutomationSchema,
} from '@/lib/automation';

/**
 * GET /api/automations
 * List automations with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('automations-list');
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
    const status = searchParams.get('status') as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | null;

    const { automations, total } = await listAutomations({
      status: status || undefined,
      page,
      limit,
    });

    return NextResponse.json({
      data: automations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing automations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automations
 * Create a new automation
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('automations-create');
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = createAutomationSchema.parse(body);

    // Create automation
    const automation = await createAutomation(validated);

    return NextResponse.json({ data: automation }, { status: 201 });
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
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
