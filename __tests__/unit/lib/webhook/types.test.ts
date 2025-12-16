import { describe, it, expect } from 'vitest';
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_DETAILS,
  createWebhookSchema,
  updateWebhookSchema,
  listWebhooksQuerySchema,
  listDeliveriesQuerySchema,
  webhookEventSchema,
  webhookAuthTypeSchema,
} from '@/lib/webhook/types';

describe('Webhook Types', () => {
  describe('WEBHOOK_EVENTS', () => {
    it('should have all email events defined', () => {
      expect(WEBHOOK_EVENTS.EMAIL_SENT).toBe('email.sent');
      expect(WEBHOOK_EVENTS.EMAIL_DELIVERED).toBe('email.delivered');
      expect(WEBHOOK_EVENTS.EMAIL_OPENED).toBe('email.opened');
      expect(WEBHOOK_EVENTS.EMAIL_CLICKED).toBe('email.clicked');
      expect(WEBHOOK_EVENTS.EMAIL_BOUNCED).toBe('email.bounced');
      expect(WEBHOOK_EVENTS.EMAIL_UNSUBSCRIBED).toBe('email.unsubscribed');
      expect(WEBHOOK_EVENTS.EMAIL_COMPLAINED).toBe('email.complained');
    });

    it('should have all campaign events defined', () => {
      expect(WEBHOOK_EVENTS.CAMPAIGN_STARTED).toBe('campaign.started');
      expect(WEBHOOK_EVENTS.CAMPAIGN_COMPLETED).toBe('campaign.completed');
      expect(WEBHOOK_EVENTS.CAMPAIGN_PAUSED).toBe('campaign.paused');
    });

    it('should have all contact events defined', () => {
      expect(WEBHOOK_EVENTS.CONTACT_CREATED).toBe('contact.created');
      expect(WEBHOOK_EVENTS.CONTACT_UPDATED).toBe('contact.updated');
    });
  });

  describe('WEBHOOK_EVENT_DETAILS', () => {
    it('should have details for all events', () => {
      const events = Object.values(WEBHOOK_EVENTS);
      for (const event of events) {
        expect(WEBHOOK_EVENT_DETAILS[event]).toBeDefined();
        expect(WEBHOOK_EVENT_DETAILS[event].name).toBeDefined();
        expect(WEBHOOK_EVENT_DETAILS[event].description).toBeDefined();
      }
    });
  });

  describe('webhookEventSchema', () => {
    it('should accept valid event types', () => {
      expect(() => webhookEventSchema.parse('email.sent')).not.toThrow();
      expect(() => webhookEventSchema.parse('email.opened')).not.toThrow();
      expect(() => webhookEventSchema.parse('campaign.started')).not.toThrow();
      expect(() => webhookEventSchema.parse('contact.created')).not.toThrow();
    });

    it('should reject invalid event types', () => {
      expect(() => webhookEventSchema.parse('invalid.event')).toThrow();
      expect(() => webhookEventSchema.parse('')).toThrow();
      expect(() => webhookEventSchema.parse('email')).toThrow();
    });
  });

  describe('webhookAuthTypeSchema', () => {
    it('should accept valid auth types', () => {
      expect(() => webhookAuthTypeSchema.parse('NONE')).not.toThrow();
      expect(() => webhookAuthTypeSchema.parse('BASIC')).not.toThrow();
      expect(() => webhookAuthTypeSchema.parse('BEARER')).not.toThrow();
      expect(() => webhookAuthTypeSchema.parse('API_KEY')).not.toThrow();
      expect(() => webhookAuthTypeSchema.parse('HMAC')).not.toThrow();
    });

    it('should reject invalid auth types', () => {
      expect(() => webhookAuthTypeSchema.parse('INVALID')).toThrow();
      expect(() => webhookAuthTypeSchema.parse('')).toThrow();
    });
  });

  describe('createWebhookSchema', () => {
    it('should accept valid webhook data', () => {
      const validData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent', 'email.opened'],
      };

      const result = createWebhookSchema.parse(validData);
      expect(result.name).toBe('Test Webhook');
      expect(result.url).toBe('https://example.com/webhook');
      expect(result.events).toEqual(['email.sent', 'email.opened']);
    });

    it('should apply default values', () => {
      const validData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
      };

      const result = createWebhookSchema.parse(validData);
      expect(result.authType).toBe('NONE');
      expect(result.timeout).toBe(30000);
      expect(result.maxRetries).toBe(3);
      expect(result.isActive).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
      };

      expect(() => createWebhookSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'not-a-url',
        events: ['email.sent'],
      };

      expect(() => createWebhookSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty events array', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: [],
      };

      expect(() => createWebhookSchema.parse(invalidData)).toThrow();
    });

    it('should require authValue for BEARER auth type', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        authType: 'BEARER',
        // authValue missing
      };

      expect(() => createWebhookSchema.parse(invalidData)).toThrow();
    });

    it('should require authHeader for API_KEY auth type', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        authType: 'API_KEY',
        authValue: 'my-api-key',
        // authHeader missing
      };

      expect(() => createWebhookSchema.parse(invalidData)).toThrow();
    });

    it('should require secret for HMAC auth type', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        authType: 'HMAC',
        // secret missing
      };

      expect(() => createWebhookSchema.parse(invalidData)).toThrow();
    });

    it('should accept valid BEARER auth configuration', () => {
      const validData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        authType: 'BEARER',
        authValue: 'my-token',
      };

      expect(() => createWebhookSchema.parse(validData)).not.toThrow();
    });

    it('should accept valid API_KEY auth configuration', () => {
      const validData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        authType: 'API_KEY',
        authHeader: 'X-API-Key',
        authValue: 'my-api-key',
      };

      expect(() => createWebhookSchema.parse(validData)).not.toThrow();
    });

    it('should accept valid HMAC auth configuration', () => {
      const validData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        authType: 'HMAC',
        secret: 'my-secret',
      };

      expect(() => createWebhookSchema.parse(validData)).not.toThrow();
    });
  });

  describe('updateWebhookSchema', () => {
    it('should accept partial data', () => {
      const partialData = {
        name: 'Updated Name',
      };

      const result = updateWebhookSchema.parse(partialData);
      expect(result.name).toBe('Updated Name');
      expect(result.url).toBeUndefined();
    });

    it('should accept empty object', () => {
      expect(() => updateWebhookSchema.parse({})).not.toThrow();
    });
  });

  describe('listWebhooksQuerySchema', () => {
    it('should parse and apply defaults', () => {
      const result = listWebhooksQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should parse string numbers', () => {
      const result = listWebhooksQuerySchema.parse({
        page: '5',
        limit: '50',
      });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should parse boolean strings', () => {
      const result = listWebhooksQuerySchema.parse({
        isActive: 'true',
      });
      expect(result.isActive).toBe(true);
    });

    it('should accept event filter', () => {
      const result = listWebhooksQuerySchema.parse({
        event: 'email.sent',
      });
      expect(result.event).toBe('email.sent');
    });
  });

  describe('listDeliveriesQuerySchema', () => {
    it('should parse and apply defaults', () => {
      const result = listDeliveriesQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept status filter', () => {
      const result = listDeliveriesQuerySchema.parse({
        status: 'DELIVERED',
      });
      expect(result.status).toBe('DELIVERED');
    });

    it('should accept date filters', () => {
      const result = listDeliveriesQuerySchema.parse({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });
  });
});
