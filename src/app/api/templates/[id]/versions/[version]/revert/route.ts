import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { versionNumberSchema, revertVersionSchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { revertToVersion, getVersion } from '@/lib/template';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; version: string }>;
}

/**
 * POST /api/templates/[id]/versions/[version]/revert
 * Revert template to a specific version
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, version: versionStr } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-revert-${id}`);
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

    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id },
      select: { id: true, currentVersion: true, userId: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if target version exists
    const targetVersion = await getVersion(id, version);
    if (!targetVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Cannot revert to current version
    if (version === template.currentVersion) {
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

    // Perform revert
    const result = await revertToVersion(
      id,
      version,
      template.userId ?? undefined,
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
  } catch (error) {
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
}
