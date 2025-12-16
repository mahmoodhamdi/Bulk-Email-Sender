import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { sendNotificationSchema } from '@/lib/validations/fcm';
import {
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
} from '@/lib/firebase/admin';

/**
 * POST /api/fcm/send - Send push notification
 * Requires admin role for sending to multiple users
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const validation = sendNotificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { token, tokens, userId, userIds, topic, title, body: notificationBody, imageUrl, data } = validation.data;

    // For sending to multiple users, require admin
    if ((userIds && userIds.length > 1) || topic) {
      if (!isAdmin(session)) {
        return NextResponse.json(
          { error: 'Admin privileges required for broadcast notifications' },
          { status: 403 }
        );
      }
    }

    // Non-admin users can only send to themselves
    if (userId && userId !== session.user.id && !isAdmin(session)) {
      return NextResponse.json(
        { error: 'You can only send notifications to yourself' },
        { status: 403 }
      );
    }

    let result: {
      success: boolean;
      successCount?: number;
      failureCount?: number;
      messageId?: string;
      failedTokens?: string[];
    };

    // Send to topic
    if (topic) {
      const messageId = await sendTopicNotification(
        topic,
        title,
        notificationBody,
        data,
        imageUrl
      );
      result = { success: true, messageId };
    }
    // Send to specific tokens
    else if (tokens && tokens.length > 0) {
      const response = await sendMulticastNotification(
        tokens,
        title,
        notificationBody,
        data,
        imageUrl
      );
      result = {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens: response.failedTokens,
      };

      // Mark failed tokens as inactive
      if (response.failedTokens.length > 0) {
        await prisma.fcmToken.updateMany({
          where: { token: { in: response.failedTokens } },
          data: { isActive: false },
        });
      }
    }
    // Send to single token
    else if (token) {
      const messageId = await sendPushNotification(
        token,
        title,
        notificationBody,
        data,
        imageUrl
      );
      result = { success: true, messageId };
    }
    // Send to user(s) by ID
    else if (userId || userIds) {
      const targetUserIds = userIds || [userId!];

      // Get all active tokens for the target users
      const fcmTokens = await prisma.fcmToken.findMany({
        where: {
          userId: { in: targetUserIds },
          isActive: true,
        },
        select: { token: true },
      });

      const tokenList = fcmTokens.map((t) => t.token);

      if (tokenList.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No active FCM tokens found for the specified user(s)',
        });
      }

      const response = await sendMulticastNotification(
        tokenList,
        title,
        notificationBody,
        data,
        imageUrl
      );

      result = {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens: response.failedTokens,
      };

      // Mark failed tokens as inactive
      if (response.failedTokens.length > 0) {
        await prisma.fcmToken.updateMany({
          where: { token: { in: response.failedTokens } },
          data: { isActive: false },
        });
      }
    } else {
      return NextResponse.json(
        { error: 'No target specified' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
