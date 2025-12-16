import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { templateIdSchema } from '@/lib/validations/template';
import { versionNumberSchema } from '@/lib/validations/template-version';
import { apiRateLimiter } from '@/lib/rate-limit';
import { getVersion } from '@/lib/template';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; version: string }>;
}

/**
 * GET /api/templates/[id]/versions/[version]
 * Get a specific version of a template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, version: versionStr } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-version-${id}-${versionStr}`);
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
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get version
    const versionData = await getVersion(id, version);

    if (!versionData) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
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
}
