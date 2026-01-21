import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createTemplateSchema, listTemplatesSchema } from '@/lib/validations/template';
import { apiRateLimiter } from '@/lib/rate-limit';
import { createInitialVersion } from '@/lib/template';
import { sanitizeEmailHtml } from '@/lib/sanitize-server';
import { withAuth, AuthContext } from '@/lib/auth';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/templates
 * List templates with pagination and filtering
 * Requires authentication - users can only see their own templates
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`templates-list-${context.userId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      isDefault: searchParams.get('isDefault') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    // Validate parameters
    const validated = listTemplatesSchema.parse(params);
    const { page, limit, category, search, isDefault, sortBy, sortOrder } = validated;

    // Build where clause - ALWAYS filter by userId for security
    const where: Prisma.TemplateWhereInput = {
      userId: context.userId, // Owner filter - users can only see their own templates
    };
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isDefault !== undefined) {
      where.isDefault = isDefault;
    }

    // Get total count
    const total = await prisma.template.count({ where });

    // Get templates
    const templates = await prisma.template.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    return NextResponse.json({
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:read' });

/**
 * POST /api/templates
 * Create a new template
 * Requires authentication - template is associated with the authenticated user
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`templates-create-${context.userId}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = createTemplateSchema.parse(body);

    // Check for existing template with same name for this user
    const existing = await prisma.template.findFirst({
      where: {
        name: validated.name,
        userId: context.userId, // Check only within user's templates
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    // If setting as default, unset other defaults for this user
    if (validated.isDefault) {
      await prisma.template.updateMany({
        where: {
          isDefault: true,
          userId: context.userId,
        },
        data: { isDefault: false },
      });
    }

    // Sanitize HTML content to prevent XSS attacks (preserves merge tags)
    const sanitizedContent = sanitizeEmailHtml(validated.content);

    // Create template - associate with authenticated user
    const template = await prisma.template.create({
      data: {
        name: validated.name,
        subject: validated.subject,
        content: sanitizedContent,
        thumbnail: validated.thumbnail,
        category: validated.category,
        isDefault: validated.isDefault,
        currentVersion: 1,
        userId: context.userId, // Associate with authenticated user
      },
    });

    // Create initial version (v1)
    await createInitialVersion(template.id, {
      name: validated.name,
      subject: validated.subject,
      content: sanitizedContent,
      thumbnail: validated.thumbnail,
      category: validated.category,
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
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'templates:write' });
