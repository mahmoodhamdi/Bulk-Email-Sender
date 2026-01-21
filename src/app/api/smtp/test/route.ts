import { NextRequest, NextResponse } from 'next/server';
import { createEmailSender } from '@/lib/email/sender';
import { apiRateLimiter } from '@/lib/rate-limit';
import { withAuth, AuthContext } from '@/lib/auth';

/**
 * POST /api/smtp/test
 * Test SMTP connection
 * Requires authentication - prevents unauthorized SMTP probing
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  // Apply rate limiting (5 requests per 5 minutes per user)
  const rateLimitResult = apiRateLimiter.check(`smtp-test-${context.userId}`);
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { host, port, secure, username, password } = body;

    if (!host || !port || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sender = createEmailSender({
      host,
      port,
      secure: secure || false,
      auth: {
        user: username,
        pass: password,
      },
    });

    const isValid = await sender.verify();

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Connection verification failed' },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 500 }
    );
  }
}, { requiredPermission: 'campaigns:write' });
