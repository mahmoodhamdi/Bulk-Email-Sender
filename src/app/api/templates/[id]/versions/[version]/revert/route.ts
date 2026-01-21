import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { versionNumberSchema, revertVersionSchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { revertToVersion, getVersion } from '@/lib/template';
import { ZodError } from 'zod';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';

interface RouteParams {
  id: string;
  version: string;
}

/**
 * Helper function to validate template ownership
 */
async function validateTemplateOwnership(templateId: string, userId: string): Promise<{ isOwner: boolean; currentVersion?: number }> {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      userId: userId,
    },
    select: { id: true, currentVersion: true },
  });
  return {
    isOwner: template !== null,
    currentVersion: template?.currentVersion,
  };
}

/**
 * POST /api/templates/[id]/versions/[version]/revert
 * Revert template to a specific version
 * Requires authentication - users can only revert their own templates
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id || !params?.version) {
      return createErrorResponse('Template ID and version are required', 400);
    }
    const { id, version: versionStr } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-revert-${context.userId}-${id}`);
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
    const { isOwner, currentVersion } = await validateTemplateOwnership(id, context.userId);
    if (!isOwner) {
      return createErrorResponse('Template not found', 404);
    }

    // Check if target version exists
    const targetVersion = await getVersion(id, version);
    if (!targetVersion) {
      return createErrorResponse('Version not found', 404);
    }

    // Cannot revert to current version
    if (version === currentVersion) {
      return NextResponse.json(
        { error: 'Cannot revert to the current version' },
        { status: 400 }
      );
    }

    // Parse body for optional custom summary
    let changeSummary: string | undefined;
    try {
      const body = await request.json();
      const validated = revertVersionSchema.parse(body);
      changeSummary = validated.changeSummary;
    } catch {
      // Body is optional, ignore parsing errors
    }

    // Perform revert - use authenticated user ID
    const result = await revertToVersion(
      id,
      version,
      context.userId,
      changeSummary
    );

    return NextResponse.json({
      data: {
        template: {
          id: result.template.id,
          name: result.template.name,
          currentVersion: result.template.currentVersion,
        },
        newVersion: {
          version: result.version.version,
          changeType: result.version.changeType,
          changeSummary: result.version.changeSummary,
          createdAt: result.version.createdAt,
        },
      },
      message: `Successfully reverted to version ${version}`,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    console.error('Error reverting template version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:write' });
