import { NextRequest, NextResponse } from 'next/server';
import { createEmailSender } from '@/lib/email/sender';
import { replaceMergeTags } from '@/lib/email/merge-tags';
import { emailSendRateLimiter } from '@/lib/rate-limit';
import { isValidEmail } from '@/lib/utils';

export interface TestEmailRequest {
  to: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
  smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  testContact?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  };
}

export interface TestEmailResult {
  success: boolean;
  recipient: string;
  messageId?: string;
  error?: string;
}

export interface TestEmailResponse {
  success: boolean;
  results: TestEmailResult[];
  totalSent: number;
  totalFailed: number;
}

export async function POST(request: NextRequest) {
  // Apply rate limiting (10 requests per minute)
  const rateLimitResponse = await emailSendRateLimiter.middleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body: TestEmailRequest = await request.json();
    const {
      to,
      subject,
      htmlContent,
      textContent,
      fromName = 'Test Sender',
      fromEmail = 'test@example.com',
      smtpConfig,
      testContact,
    } = body;

    // Validate required fields
    if (!to || to.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Email content is required' },
        { status: 400 }
      );
    }

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.port) {
      return NextResponse.json(
        { success: false, error: 'SMTP configuration is required' },
        { status: 400 }
      );
    }

    // Validate emails using RFC 5321 compliant validation
    const invalidEmails = to.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    // Limit to 5 test emails
    if (to.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 test emails allowed' },
        { status: 400 }
      );
    }

    // Create email sender
    const sender = createEmailSender({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    // Verify connection first
    const isValid = await sender.verify();
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'SMTP connection failed. Please check your configuration.' },
        { status: 400 }
      );
    }

    // Prepare content with merge tags replaced
    const contact = testContact || {
      email: to[0],
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Company',
      phone: '+1234567890',
    };

    const processedSubject = replaceMergeTags(subject, contact);
    const processedHtml = replaceMergeTags(htmlContent, contact);
    const processedText = textContent ? replaceMergeTags(textContent, contact) : undefined;

    // Send test emails
    const results: TestEmailResult[] = [];

    for (const recipient of to) {
      const result = await sender.send({
        from: fromEmail,
        fromName: fromName,
        to: recipient,
        subject: `[TEST] ${processedSubject}`,
        html: processedHtml,
        text: processedText,
      });

      results.push({
        success: result.success,
        recipient,
        messageId: result.messageId,
        error: result.error,
      });
    }

    const totalSent = results.filter((r) => r.success).length;
    const totalFailed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: totalSent > 0,
      results,
      totalSent,
      totalFailed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test send failed',
      },
      { status: 500 }
    );
  }
}
