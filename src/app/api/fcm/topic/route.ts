import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { topicSubscriptionSchema } from '@/lib/validations/fcm';
import { subscribeToTopic, unsubscribeFromTopic } from '@/lib/firebase/admin';

/**
 * POST /api/fcm/topic - Subscribe current user's tokens to a topic
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const validation = topicSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { topic, tokens } = validation.data;

    // If tokens provided, use them; otherwise get user's active tokens
    let tokenList: string[];

    if (tokens && tokens.length > 0) {
      tokenList = tokens;
    } else {
      const fcmTokens = await prisma.fcmToken.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        select: { token: true },
      });
      tokenList = fcmTokens.map((t) => t.token);
    }

    if (tokenList.length === 0) {
      return NextResponse.json(
        { error: 'No active FCM tokens found' },
        { status: 400 }
      );
    }

    const result = await subscribeToTopic(tokenList, topic);

    return NextResponse.json({
      success: true,
      message: `Subscribed to topic: ${topic}`,
      data: {
        topic,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    });
  } catch (error) {
    console.error('Topic subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to topic' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fcm/topic - Unsubscribe current user's tokens from a topic
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const validation = topicSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { topic, tokens } = validation.data;

    // If tokens provided, use them; otherwise get user's active tokens
    let tokenList: string[];

    if (tokens && tokens.length > 0) {
      tokenList = tokens;
    } else {
      const fcmTokens = await prisma.fcmToken.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        select: { token: true },
      });
      tokenList = fcmTokens.map((t) => t.token);
    }

    if (tokenList.length === 0) {
      return NextResponse.json(
        { error: 'No active FCM tokens found' },
        { status: 400 }
      );
    }

    const result = await unsubscribeFromTopic(tokenList, topic);

    return NextResponse.json({
      success: true,
      message: `Unsubscribed from topic: ${topic}`,
      data: {
        topic,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    });
  } catch (error) {
    console.error('Topic unsubscription error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from topic' },
      { status: 500 }
    );
  }
}
