import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { compareVersionsQuerySchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { compareVersions } from '@/lib/template';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/templates/[id]/versions/compare?v1=X&v2=Y
 * Compare two versions of a template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-compare-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      v1: searchParams.get('v1'),
      v2: searchParams.get('v2'),
    };

    if (!queryParams.v1 || !queryParams.v2) {
      return NextResponse.json(
        { error: 'Both v1 and v2 query parameters are required' },
        { status: 400 }
      );
    }

    const validated = compareVersionsQuerySchema.parse(queryParams);

    // Compare versions
    const comparison = await compareVersions(id, validated.v1, validated.v2);

    if (!comparison) {
      return NextResponse.json(
        { error: 'One or both versions not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: comparison });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error comparing template versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
