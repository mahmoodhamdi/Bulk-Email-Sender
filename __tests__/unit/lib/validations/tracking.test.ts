import { describe, it, expect } from 'vitest';
import {
  EventTypeEnum,
  trackOpenSchema,
  trackClickSchema,
  unsubscribeSchema,
  webhookEventSchema,
  listEventsSchema,
  campaignAnalyticsSchema,
  recipientStatsSchema,
  bounceEventSchema,
  complaintEventSchema,
} from '@/lib/validations/tracking';

describe('Tracking Validation Schemas', () => {
  describe('EventTypeEnum', () => {
    it('should accept valid event types', () => {
      const validTypes = ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'UNSUBSCRIBED', 'COMPLAINED'];
      validTypes.forEach((type) => {
        expect(() => EventTypeEnum.parse(type)).not.toThrow();
      });
    });

    it('should reject invalid event types', () => {
      expect(() => EventTypeEnum.parse('INVALID')).toThrow();
      expect(() => EventTypeEnum.parse('sent')).toThrow();
      expect(() => EventTypeEnum.parse('')).toThrow();
    });
  });

  describe('trackOpenSchema', () => {
    it('should accept valid tracking ID', () => {
      const result = trackOpenSchema.parse({ trackingId: 'abc123' });
      expect(result.trackingId).toBe('abc123');
    });

    it('should reject empty tracking ID', () => {
      expect(() => trackOpenSchema.parse({ trackingId: '' })).toThrow();
    });

    it('should reject missing tracking ID', () => {
      expect(() => trackOpenSchema.parse({})).toThrow();
    });
  });

  describe('trackClickSchema', () => {
    it('should accept valid click tracking data', () => {
      const result = trackClickSchema.parse({
        trackingId: 'abc123',
        url: 'https://example.com/page',
      });
      expect(result.trackingId).toBe('abc123');
      expect(result.url).toBe('https://example.com/page');
    });

    it('should accept click with linkId', () => {
      const result = trackClickSchema.parse({
        trackingId: 'abc123',
        url: 'https://example.com/page',
        linkId: 'link-1',
      });
      expect(result.linkId).toBe('link-1');
    });

    it('should reject invalid URL', () => {
      expect(() => trackClickSchema.parse({
        trackingId: 'abc123',
        url: 'not-a-url',
      })).toThrow();
    });

    it('should reject empty tracking ID', () => {
      expect(() => trackClickSchema.parse({
        trackingId: '',
        url: 'https://example.com',
      })).toThrow();
    });

    it('should reject missing URL', () => {
      expect(() => trackClickSchema.parse({
        trackingId: 'abc123',
      })).toThrow();
    });
  });

  describe('unsubscribeSchema', () => {
    it('should accept valid unsubscribe request', () => {
      const result = unsubscribeSchema.parse({ token: 'unsubscribe-token' });
      expect(result.token).toBe('unsubscribe-token');
    });

    it('should accept unsubscribe with reason', () => {
      const result = unsubscribeSchema.parse({
        token: 'unsubscribe-token',
        reason: 'Too many emails',
      });
      expect(result.reason).toBe('Too many emails');
    });

    it('should reject empty token', () => {
      expect(() => unsubscribeSchema.parse({ token: '' })).toThrow();
    });

    it('should reject reason over 500 characters', () => {
      const longReason = 'a'.repeat(501);
      expect(() => unsubscribeSchema.parse({
        token: 'token',
        reason: longReason,
      })).toThrow();
    });
  });

  describe('webhookEventSchema', () => {
    it('should accept valid webhook event', () => {
      const result = webhookEventSchema.parse({
        type: 'DELIVERED',
        email: 'test@example.com',
      });
      expect(result.type).toBe('DELIVERED');
      expect(result.email).toBe('test@example.com');
    });

    it('should accept webhook with all fields', () => {
      const result = webhookEventSchema.parse({
        type: 'BOUNCED',
        email: 'test@example.com',
        campaignId: 'campaign-123',
        recipientId: 'recipient-456',
        timestamp: '2024-01-15T10:00:00Z',
        metadata: { bounceType: 'hard' },
      });
      expect(result.campaignId).toBe('campaign-123');
      expect(result.metadata).toEqual({ bounceType: 'hard' });
    });

    it('should reject invalid event type', () => {
      expect(() => webhookEventSchema.parse({
        type: 'INVALID',
        email: 'test@example.com',
      })).toThrow();
    });

    it('should reject invalid email', () => {
      expect(() => webhookEventSchema.parse({
        type: 'DELIVERED',
        email: 'invalid',
      })).toThrow();
    });

    it('should reject invalid timestamp format', () => {
      expect(() => webhookEventSchema.parse({
        type: 'DELIVERED',
        email: 'test@example.com',
        timestamp: 'not-a-date',
      })).toThrow();
    });
  });

  describe('listEventsSchema', () => {
    it('should use defaults for empty object', () => {
      const result = listEventsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers', () => {
      const result = listEventsSchema.parse({ page: '5', limit: '25' });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(25);
    });

    it('should reject limit over 100', () => {
      expect(() => listEventsSchema.parse({ limit: '101' })).toThrow();
    });

    it('should accept filters', () => {
      const result = listEventsSchema.parse({
        campaignId: 'campaign-123',
        type: 'OPENED',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      });
      expect(result.campaignId).toBe('campaign-123');
      expect(result.type).toBe('OPENED');
    });

    it('should accept valid sortBy values', () => {
      expect(() => listEventsSchema.parse({ sortBy: 'createdAt' })).not.toThrow();
      expect(() => listEventsSchema.parse({ sortBy: 'type' })).not.toThrow();
    });

    it('should reject invalid sortBy value', () => {
      expect(() => listEventsSchema.parse({ sortBy: 'invalid' })).toThrow();
    });
  });

  describe('campaignAnalyticsSchema', () => {
    it('should accept valid analytics request', () => {
      const result = campaignAnalyticsSchema.parse({
        campaignId: 'campaign-123',
      });
      expect(result.campaignId).toBe('campaign-123');
      expect(result.granularity).toBe('day');
    });

    it('should accept analytics with date range', () => {
      const result = campaignAnalyticsSchema.parse({
        campaignId: 'campaign-123',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        granularity: 'hour',
      });
      expect(result.granularity).toBe('hour');
    });

    it('should reject empty campaign ID', () => {
      expect(() => campaignAnalyticsSchema.parse({ campaignId: '' })).toThrow();
    });

    it('should accept valid granularity values', () => {
      const validGranularities = ['hour', 'day', 'week', 'month'];
      validGranularities.forEach((granularity) => {
        expect(() => campaignAnalyticsSchema.parse({
          campaignId: 'campaign-123',
          granularity,
        })).not.toThrow();
      });
    });

    it('should reject invalid granularity', () => {
      expect(() => campaignAnalyticsSchema.parse({
        campaignId: 'campaign-123',
        granularity: 'minute',
      })).toThrow();
    });
  });

  describe('recipientStatsSchema', () => {
    it('should accept valid stats request', () => {
      const result = recipientStatsSchema.parse({
        campaignId: 'campaign-123',
      });
      expect(result.campaignId).toBe('campaign-123');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should accept stats with status filter', () => {
      const result = recipientStatsSchema.parse({
        campaignId: 'campaign-123',
        status: 'OPENED',
        page: '2',
        limit: '25',
      });
      expect(result.status).toBe('OPENED');
      expect(result.page).toBe(2);
    });

    it('should reject empty campaign ID', () => {
      expect(() => recipientStatsSchema.parse({ campaignId: '' })).toThrow();
    });

    it('should accept valid status values', () => {
      const validStatuses = ['PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED'];
      validStatuses.forEach((status) => {
        expect(() => recipientStatsSchema.parse({
          campaignId: 'campaign-123',
          status,
        })).not.toThrow();
      });
    });

    it('should reject invalid status', () => {
      expect(() => recipientStatsSchema.parse({
        campaignId: 'campaign-123',
        status: 'INVALID',
      })).toThrow();
    });
  });

  describe('bounceEventSchema', () => {
    it('should accept valid bounce event', () => {
      const result = bounceEventSchema.parse({
        email: 'test@example.com',
        type: 'hard',
      });
      expect(result.email).toBe('test@example.com');
      expect(result.type).toBe('hard');
    });

    it('should accept bounce with all fields', () => {
      const result = bounceEventSchema.parse({
        email: 'test@example.com',
        type: 'soft',
        reason: 'Mailbox full',
        campaignId: 'campaign-123',
        recipientId: 'recipient-456',
      });
      expect(result.type).toBe('soft');
      expect(result.reason).toBe('Mailbox full');
    });

    it('should reject invalid email', () => {
      expect(() => bounceEventSchema.parse({
        email: 'invalid',
        type: 'hard',
      })).toThrow();
    });

    it('should reject invalid bounce type', () => {
      expect(() => bounceEventSchema.parse({
        email: 'test@example.com',
        type: 'invalid',
      })).toThrow();
    });

    it('should reject reason over 500 characters', () => {
      const longReason = 'a'.repeat(501);
      expect(() => bounceEventSchema.parse({
        email: 'test@example.com',
        type: 'hard',
        reason: longReason,
      })).toThrow();
    });
  });

  describe('complaintEventSchema', () => {
    it('should accept valid complaint event', () => {
      const result = complaintEventSchema.parse({
        email: 'test@example.com',
      });
      expect(result.email).toBe('test@example.com');
    });

    it('should accept complaint with all fields', () => {
      const result = complaintEventSchema.parse({
        email: 'test@example.com',
        campaignId: 'campaign-123',
        recipientId: 'recipient-456',
        feedbackType: 'abuse',
      });
      expect(result.feedbackType).toBe('abuse');
    });

    it('should reject invalid email', () => {
      expect(() => complaintEventSchema.parse({
        email: 'invalid',
      })).toThrow();
    });

    it('should reject feedbackType over 100 characters', () => {
      const longType = 'a'.repeat(101);
      expect(() => complaintEventSchema.parse({
        email: 'test@example.com',
        feedbackType: longType,
      })).toThrow();
    });
  });
});
