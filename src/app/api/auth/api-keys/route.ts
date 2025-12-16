import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { generateApiKey } from '@/lib/auth/api-key';
import { createApiKeySchema, validatePermissions } from '@/lib/validations/auth';

/**
 * GET /api/auth/api-keys - List user's API keys
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
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
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: apiKeys });
}

/**
 * POST /api/auth/api-keys - Create a new API key
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const validation = createApiKeySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, permissions, expiresAt, rateLimit } = validation.data;

    // Validate permissions
    if (permissions.length > 0 && !validatePermissions(permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions provided' },
        { status: 400 }
      );
    }

    // Check API key limit (max 10 per user)
    const existingKeysCount = await prisma.apiKey.count({
      where: { userId: session.user.id },
    });

    if (existingKeysCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum number of API keys reached (10)' },
        { status: 400 }
      );
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey();

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: hash,
        keyPrefix: prefix,
        userId: session.user.id,
        permissions,
        rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the full key only once (it won't be retrievable later)
    return NextResponse.json(
      {
        success: true,
        message: 'API key created successfully. Save this key - it won\'t be shown again.',
        data: {
          ...apiKey,
          key, // Full key only shown once
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
