import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { updateApiKeySchema, validatePermissions } from '@/lib/validations/auth';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/auth/api-keys/:id - Get API key details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      rateLimit: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  return NextResponse.json({ data: apiKey });
}

/**
 * PATCH /api/auth/api-keys/:id - Update API key
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if API key exists and belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const validation = updateApiKeySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, permissions, rateLimit, isActive } = validation.data;

    // Validate permissions if provided
    if (permissions && permissions.length > 0 && !validatePermissions(permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions provided' },
        { status: 400 }
      );
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(permissions !== undefined && { permissions }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
      data: updatedKey,
    });
  } catch (error: unknown) {
    console.error('API key update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/api-keys/:id - Delete (revoke) API key
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if API key exists and belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error: unknown) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
