import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { adminUpdateUserSchema } from '@/lib/validations/auth';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/:id - Get user details (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
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
          templates: true,
          contacts: true,
          contactLists: true,
          smtpConfigs: true,
          apiKeys: true,
        },
      },
      campaigns: {
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

/**
 * PATCH /api/admin/users/:id - Update user (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-modification of role
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot modify your own role or status via admin API' },
        { status: 400 }
      );
    }

    // Only super admins can modify other admins or super admins
    if (
      (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') &&
      !isSuperAdmin(session)
    ) {
      return NextResponse.json(
        { error: 'Only super admins can modify admin users' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const validation = adminUpdateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, email, role, isActive } = validation.data;

    // Only super admins can set admin or super_admin roles
    if (role && (role === 'ADMIN' || role === 'SUPER_ADMIN') && !isSuperAdmin(session)) {
      return NextResponse.json(
        { error: 'Only super admins can assign admin roles' },
        { status: 403 }
      );
    }

    // Check if email is being changed and if it's already in use
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id - Delete user (super admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSuperAdmin(session)) {
    return NextResponse.json(
      { error: 'Only super admins can delete users' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting other super admins
    if (targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete super admin accounts' },
        { status: 403 }
      );
    }

    // Delete user and all related data (cascading delete configured in schema)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
