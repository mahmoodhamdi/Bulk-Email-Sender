import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { compareVersionsQuerySchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { compareVersions } from '@/lib/template';
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
 * GET /api/templates/[id]/versions/compare?v1=X&v2=Y
 * Compare two versions of a template
 * Requires authentication - users can only compare versions of their own templates
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('Template ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-compare-${context.userId}-${id}`);
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
      return createErrorResponse('One or both versions not found', 404);
    }

    return NextResponse.json({ data: comparison });
  } catch (error: unknown) {
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
}, { requiredPermission: 'templates:read' });
