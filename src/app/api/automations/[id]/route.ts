import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  getAutomation,
  updateAutomation,
  deleteAutomation,
  activateAutomation,
  pauseAutomation,
  archiveAutomation,
  updateAutomationSchema,
} from '@/lib/automation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/automations/[id]
 * Get automation details with stats
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-get-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    const automation = await getAutomation(id);
    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: automation });
  } catch (error) {
    console.error('Error getting automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/automations/[id]
 * Update automation or perform actions (activate, pause, archive)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-update-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
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
}

/**
 * DELETE /api/automations/[id]
 * Delete an automation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`automations-delete-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    await deleteAutomation(id);

    return NextResponse.json(
      { message: 'Automation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
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
}
