import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { listUsersQuerySchema } from '@/lib/validations/auth';

/**
 * GET /api/admin/users - List all users (admin only)
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = listUsersQuerySchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, search, role, isActive } = validation.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
      isActive?: boolean;
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }>;
    } = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              campaigns: true,
              contacts: true,
              apiKeys: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: unknown) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
