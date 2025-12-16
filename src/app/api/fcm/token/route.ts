import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { registerFcmTokenSchema } from '@/lib/validations/fcm';

/**
 * POST /api/fcm/token - Register FCM token for current user
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const validation = registerFcmTokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { token, deviceInfo } = validation.data;

    // Upsert the token (update if exists, create if not)
    const fcmToken = await prisma.fcmToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        platform: deviceInfo?.platform,
        browser: deviceInfo?.browser,
        os: deviceInfo?.os,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        token,
        userId: session.user.id,
        platform: deviceInfo?.platform,
        browser: deviceInfo?.browser,
        os: deviceInfo?.os,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        id: fcmToken.id,
        platform: fcmToken.platform,
      },
    });
  } catch (error: unknown) {
    console.error('FCM token registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fcm/token - Unregister FCM token
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Soft delete - mark as inactive
    await prisma.fcmToken.updateMany({
      where: {
        token,
        userId: session.user.id,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'FCM token unregistered successfully',
    });
  } catch (error: unknown) {
    console.error('FCM token unregister error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fcm/token - List user's FCM tokens
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tokens = await prisma.fcmToken.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        browser: true,
        os: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return NextResponse.json({ data: tokens });
  } catch (error: unknown) {
    console.error('FCM token list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
