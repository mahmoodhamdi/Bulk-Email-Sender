import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { versionNumberSchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { getVersion } from '@/lib/template';
import { ZodError } from 'zod';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

interface RouteParams {
  id: string;
  version: string;
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
 * GET /api/templates/[id]/versions/[version]
 * Get a specific version of a template
 * Requires authentication - users can only view versions of their own templates
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id || !params?.version) {
      return createErrorResponse('ID and version are required', 400);
    }
    const { id, version: versionStr } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-version-${context.userId}-${id}-${versionStr}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate parameters
    templateIdSchema.parse({ id });
    const { version } = versionNumberSchema.parse({ version: versionStr });

    // Owner validation - check if template belongs to the user
    const isOwner = await validateTemplateOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('Template not found', 404);
    }

    // Get version
    const versionData = await getVersion(id, version);

    if (!versionData) {
      return createErrorResponse('Version not found', 404);
    }

    return NextResponse.json({ data: versionData });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error getting template version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:read' });
