import { NextResponse } from 'next/server';
import { apiRateLimiter } from '@/lib/rate-limit';
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_DETAILS } from '@/lib/webhook';

/**
 * GET /api/webhooks/events
 * List all available webhook events
 */
export async function GET() {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('webhooks-events');
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Build events list
    const events = Object.values(WEBHOOK_EVENTS).map((eventId) => ({
      id: eventId,
      ...WEBHOOK_EVENT_DETAILS[eventId],
    }));

    // Group by category
    const groupedEvents = {
      email: events.filter((e) => e.id.startsWith('email.')),
      campaign: events.filter((e) => e.id.startsWith('campaign.')),
      contact: events.filter((e) => e.id.startsWith('contact.')),
    };

    return NextResponse.json({
      data: {
        events,
        grouped: groupedEvents,
      },
    });
  } catch (error: unknown) {
    console.error('Error listing webhook events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
