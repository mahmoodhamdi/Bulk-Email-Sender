import { NextRequest, NextResponse } from 'next/server';
import { createEmailSender } from '@/lib/email/sender';

export async function POST(request: NextRequest) {
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 500 }
    );
  }
}
