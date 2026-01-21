import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { updateTemplateSchema, templateIdSchema, duplicateTemplateSchema } from '@/lib/validations/template';
import { apiRateLimiter } from '@/lib/rate-limit';
import { createVersion, createInitialVersion } from '@/lib/template';
import { sanitizeEmailHtml } from '@/lib/sanitize-server';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';
import { ZodError } from 'zod';

interface RouteParams {
  id: string;
}

/**
 * GET /api/templates/[id]
 * Get a single template by ID
 * Requires authentication - users can only access their own templates
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-get-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Get template with related campaigns - MUST filter by userId (owner validation)
    const template = await prisma.template.findFirst({
      where: {
        id,
        userId: context.userId, // Owner validation
      },
      include: {
        campaigns: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!template) {
      return createErrorResponse('Template not found', 404);
    }

    return NextResponse.json({ data: template });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error getting template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:read' });

/**
 * PUT /api/templates/[id]
 * Update an existing template
 * Requires authentication - users can only update their own templates
 */
export const PUT = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-update-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Check if template exists AND belongs to the user (owner validation)
    const existing = await prisma.template.findFirst({
      where: {
        id,
        userId: context.userId, // Owner validation
      },
      select: {
        id: true,
        name: true,
        subject: true,
        content: true,
        thumbnail: true,
        category: true,
        userId: true,
      },
    });

    if (!existing) {
      return createErrorResponse('Template not found', 404);
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateTemplateSchema.parse(body);

    // If name is being updated, check for duplicates within user's templates
    if (validated.name && validated.name !== existing.name) {
      const nameExists = await prisma.template.findFirst({
        where: {
          name: validated.name,
          userId: context.userId, // Check only within user's templates
          id: { not: id },
        },
      });
      if (nameExists) {
        return NextResponse.json(
          { error: 'Template with this name already exists' },
          { status: 409 }
        );
      }
    }

    // If setting as default, unset other defaults for this user
    if (validated.isDefault === true) {
      await prisma.template.updateMany({
        where: {
          isDefault: true,
          id: { not: id },
          userId: context.userId,
        },
        data: { isDefault: false },
      });
    }

    // Build update data with sanitized content
    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.subject !== undefined) updateData.subject = validated.subject;
    if (validated.content !== undefined) {
      // Sanitize HTML content to prevent XSS attacks (preserves merge tags)
      updateData.content = sanitizeEmailHtml(validated.content);
    }
    if (validated.thumbnail !== undefined) updateData.thumbnail = validated.thumbnail;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.isDefault !== undefined) updateData.isDefault = validated.isDefault;

    // Update template
    const template = await prisma.template.update({
      where: { id },
      data: updateData,
    });

    // Create a new version if versioned fields changed
    const oldData = {
      name: existing.name,
      subject: existing.subject,
      content: existing.content,
      thumbnail: existing.thumbnail,
      category: existing.category,
    };
    const newData = {
      name: template.name,
      subject: template.subject,
      content: template.content,
      thumbnail: template.thumbnail,
      category: template.category,
    };

    await createVersion(id, oldData, newData, context.userId);

    return NextResponse.json({ data: template });
  } catch (error: unknown) {
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
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:write' });

/**
 * DELETE /api/templates/[id]
 * Delete a template
 * Requires authentication - users can only delete their own templates
 */
export const DELETE = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-delete-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Check if template exists, belongs to user, and has associated campaigns (owner validation)
    const existing = await prisma.template.findFirst({
      where: {
        id,
        userId: context.userId, // Owner validation
      },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!existing) {
      return createErrorResponse('Template not found', 404);
    }

    // Prevent deletion if template is used by campaigns
    if (existing._count.campaigns > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is used by campaigns' },
        { status: 400 }
      );
    }

    // Delete template
    await prisma.template.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:delete' });

/**
 * POST /api/templates/[id]
 * Duplicate a template
 * Requires authentication - users can only duplicate their own templates
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('ID is required', 400);
    }
    const { id } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-duplicate-${context.userId}-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Get original template - MUST belong to the user (owner validation)
    const original = await prisma.template.findFirst({
      where: {
        id,
        userId: context.userId, // Owner validation
      },
    });

    if (!original) {
      return createErrorResponse('Template not found', 404);
    }

    // Parse and validate body
    const body = await request.json();
    const validated = duplicateTemplateSchema.parse(body);

    // Check if name already exists for this user
    const nameExists = await prisma.template.findFirst({
      where: {
        name: validated.name,
        userId: context.userId, // Check only within user's templates
      },
    });
    if (nameExists) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    // Create duplicate - associate with authenticated user
    const template = await prisma.template.create({
      data: {
        name: validated.name,
        subject: original.subject,
        content: original.content,
        thumbnail: original.thumbnail,
        category: original.category,
        isDefault: false, // Duplicates are never default
        userId: context.userId, // Associate with authenticated user
      },
    });

    // Create initial version for the duplicate
    await createInitialVersion(template.id, {
      name: validated.name,
      subject: original.subject,
      content: original.content,
      thumbnail: original.thumbnail,
      category: original.category,
    }, context.userId);

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error: unknown) {
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
    console.error('Error duplicating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:write' });
