import { describe, it, expect } from 'vitest';
import {
  registerFcmTokenSchema,
  sendNotificationSchema,
  topicSubscriptionSchema,
} from '@/lib/validations/fcm';

describe('FCM Validation Schemas', () => {
  describe('registerFcmTokenSchema', () => {
    it('should validate a valid token', () => {
      const validData = {
        token: 'valid-fcm-token-123',
      };

      const result = registerFcmTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate token with device info', () => {
      const validData = {
        token: 'valid-fcm-token-123',
        deviceInfo: {
          platform: 'web',
          browser: 'Chrome',
          os: 'Windows',
        },
      };

      const result = registerFcmTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const invalidData = {
        token: '',
      };

      const result = registerFcmTokenSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('FCM token is required');
      }
    });

    it('should reject missing token', () => {
      const invalidData = {};

      const result = registerFcmTokenSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('sendNotificationSchema', () => {
    it('should validate notification with single token', () => {
      const validData = {
        token: 'single-token',
        title: 'Test Title',
        body: 'Test Body',
      };

      const result = sendNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate notification with multiple tokens', () => {
      const validData = {
        tokens: ['token1', 'token2'],
        title: 'Test Title',
        body: 'Test Body',
      };

      const result = sendNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate notification with userId', () => {
      const validData = {
        userId: 'user-123',
        title: 'Test Title',
        body: 'Test Body',
      };

      const result = sendNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate notification with userIds', () => {
      const validData = {
        userIds: ['user-1', 'user-2'],
        title: 'Test Title',
        body: 'Test Body',
      };

      const result = sendNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate notification with topic', () => {
      const validData = {
        topic: 'announcements',
        title: 'Test Title',
        body: 'Test Body',
      };

      const result = sendNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate notification with data payload', () => {
      const validData = {
        token: 'test-token',
        title: 'Test Title',
        body: 'Test Body',
        data: {
          campaignId: '123',
          action: 'open',
        },
      };

      const result = sendNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate notification with image URL', () => {
      const validData = {
        token: 'test-token',
        title: 'Test Title',
        body: 'Test Body',
        imageUrl: 'https://example.com/image.png',
      };

      const result = sendNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalidData = {
        token: 'test-token',
        title: '',
        body: 'Test Body',
      };

      const result = sendNotificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty body', () => {
      const invalidData = {
        token: 'test-token',
        title: 'Test Title',
        body: '',
      };

      const result = sendNotificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject title over 200 characters', () => {
      const invalidData = {
        token: 'test-token',
        title: 'a'.repeat(201),
        body: 'Test Body',
      };

      const result = sendNotificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject body over 1000 characters', () => {
      const invalidData = {
        token: 'test-token',
        title: 'Test Title',
        body: 'a'.repeat(1001),
      };

      const result = sendNotificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid image URL', () => {
      const invalidData = {
        token: 'test-token',
        title: 'Test Title',
        body: 'Test Body',
        imageUrl: 'not-a-url',
      };

      const result = sendNotificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('topicSubscriptionSchema', () => {
    it('should validate topic subscription', () => {
      const validData = {
        topic: 'news',
      };

      const result = topicSubscriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate topic with tokens', () => {
      const validData = {
        topic: 'news',
        tokens: ['token1', 'token2'],
      };

      const result = topicSubscriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty topic', () => {
      const invalidData = {
        topic: '',
      };

      const result = topicSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject topic with invalid characters', () => {
      const invalidData = {
        topic: 'invalid topic!',
      };

      const result = topicSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept topic with valid characters', () => {
      const validData = {
        topic: 'valid-topic_name123',
      };

      const result = topicSubscriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
