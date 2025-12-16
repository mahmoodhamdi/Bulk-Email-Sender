import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { listVersionsQuerySchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { getVersions } from '@/lib/template';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/templates/[id]/versions
 * List all versions for a template with pagination
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-versions-${id}`);
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
      select: { id: true, currentVersion: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };
    const validated = listVersionsQuerySchema.parse(queryParams);

    // Get versions
    const result = await getVersions(id, {
      page: validated.page,
      limit: validated.limit,
    });

    return NextResponse.json({
      data: result.versions,
      currentVersion: template.currentVersion,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error listing template versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
