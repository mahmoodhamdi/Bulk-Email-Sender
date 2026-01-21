import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { listVersionsQuerySchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { getVersions } from '@/lib/template';
import { ZodError } from 'zod';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

interface RouteParams {
  id: string;
}

/**
 * Helper function to validate template ownership
 */
async function validateTemplateOwnership(templateId: string, userId: string): Promise<boolean> {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      userId: userId,
    },
    select: { id: true },
  });
  return template !== null;
}

/**
 * GET /api/templates/[id]/versions
 * List all versions for a template with pagination
 * Requires authentication - users can only view versions of their own templates
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-versions-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Owner validation - check if template belongs to the user
    const isOwner = await validateTemplateOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('Template not found', 404);
    }

    // Get template with current version
    const template = await prisma.template.findUnique({
      where: { id },
      select: { id: true, currentVersion: true },
    });

    if (!template) {
      return createErrorResponse('Template not found', 404);
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
  } catch (error: unknown) {
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
}, { requiredPermission: 'templates:read' });
