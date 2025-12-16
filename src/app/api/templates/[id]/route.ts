import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { updateTemplateSchema, templateIdSchema, duplicateTemplateSchema } from '@/lib/validations/template';
import { apiRateLimiter } from '@/lib/rate-limit';
import { createVersion, createInitialVersion } from '@/lib/template';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/templates/[id]
 * Get a single template by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-get-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Get template with related campaigns
    const template = await prisma.template.findUnique({
      where: { id },
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
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (error) {
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
}

/**
 * PUT /api/templates/[id]
 * Update an existing template
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-update-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Check if template exists and get full data for versioning
    const existing = await prisma.template.findUnique({
      where: { id },
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
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateTemplateSchema.parse(body);

    // If name is being updated, check for duplicates
    if (validated.name && validated.name !== existing.name) {
      const nameExists = await prisma.template.findFirst({
        where: { name: validated.name },
      });
      if (nameExists) {
        return NextResponse.json(
          { error: 'Template with this name already exists' },
          { status: 409 }
        );
      }
    }

    // If setting as default, unset other defaults
    if (validated.isDefault === true) {
      await prisma.template.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.subject !== undefined) updateData.subject = validated.subject;
    if (validated.content !== undefined) updateData.content = validated.content;
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

    await createVersion(id, oldData, newData, existing.userId ?? undefined);

    return NextResponse.json({ data: template });
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
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-delete-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Check if template exists and has associated campaigns
    const existing = await prisma.template.findUnique({
      where: { id },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
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
  } catch (error) {
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
}

/**
 * POST /api/templates/[id]
 * Duplicate a template
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`template-duplicate-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    templateIdSchema.parse({ id });

    // Get original template
    const original = await prisma.template.findUnique({
      where: { id },
    });

    if (!original) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = duplicateTemplateSchema.parse(body);

    // Check if name already exists
    const nameExists = await prisma.template.findFirst({
      where: { name: validated.name },
    });
    if (nameExists) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    // Create duplicate
    const template = await prisma.template.create({
      data: {
        name: validated.name,
        subject: original.subject,
        content: original.content,
        thumbnail: original.thumbnail,
        category: original.category,
        isDefault: false, // Duplicates are never default
        currentVersion: 1,
      },
    });

    // Create initial version for the duplicate
    await createInitialVersion(template.id, {
      name: validated.name,
      subject: original.subject,
      content: original.content,
      thumbnail: original.thumbnail,
      category: original.category,
    }, template.userId ?? undefined);

    return NextResponse.json({ data: template }, { status: 201 });
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
    console.error('Error duplicating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
