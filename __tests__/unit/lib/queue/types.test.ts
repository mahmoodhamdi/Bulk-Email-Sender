import { describe, it, expect } from 'vitest';
import {
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
  JOB_PRIORITIES,
  SMTP_RATE_LIMITS,
  getSmtpRateLimit,
} from '@/lib/queue/types';

describe('Queue Types', () => {
  describe('DEFAULT_QUEUE_CONFIG', () => {
    it('should have valid concurrency', () => {
      expect(DEFAULT_QUEUE_CONFIG.concurrency).toBe(5);
      expect(DEFAULT_QUEUE_CONFIG.concurrency).toBeGreaterThan(0);
    });

    it('should have valid max retries', () => {
      expect(DEFAULT_QUEUE_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_QUEUE_CONFIG.maxRetries).toBeGreaterThan(0);
    });

    it('should have valid retry delay', () => {
      expect(DEFAULT_QUEUE_CONFIG.retryDelay).toBe(60000);
      expect(DEFAULT_QUEUE_CONFIG.retryDelay).toBeGreaterThan(0);
    });

    it('should have valid rate limit max', () => {
      expect(DEFAULT_QUEUE_CONFIG.rateLimitMax).toBe(10);
      expect(DEFAULT_QUEUE_CONFIG.rateLimitMax).toBeGreaterThan(0);
    });

    it('should have valid rate limit duration', () => {
      expect(DEFAULT_QUEUE_CONFIG.rateLimitDuration).toBe(1000);
      expect(DEFAULT_QUEUE_CONFIG.rateLimitDuration).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_JOB_OPTIONS', () => {
    it('should have 3 attempts', () => {
      expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    });

    it('should have exponential backoff', () => {
      expect(DEFAULT_JOB_OPTIONS.backoff).toBeDefined();
      expect((DEFAULT_JOB_OPTIONS.backoff as { type: string }).type).toBe('exponential');
      expect((DEFAULT_JOB_OPTIONS.backoff as { delay: number }).delay).toBe(60000);
    });

    it('should have removeOnComplete settings', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toBeDefined();
      expect((DEFAULT_JOB_OPTIONS.removeOnComplete as { age: number }).age).toBe(24 * 60 * 60);
      expect((DEFAULT_JOB_OPTIONS.removeOnComplete as { count: number }).count).toBe(1000);
    });

    it('should have removeOnFail settings', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnFail).toBeDefined();
      expect((DEFAULT_JOB_OPTIONS.removeOnFail as { age: number }).age).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('QUEUE_NAMES', () => {
    it('should have EMAIL queue name', () => {
      expect(QUEUE_NAMES.EMAIL).toBe('email-queue');
    });

    it('should have CAMPAIGN queue name', () => {
      expect(QUEUE_NAMES.CAMPAIGN).toBe('campaign-queue');
    });
  });

  describe('JOB_PRIORITIES', () => {
    it('should have HIGH priority as 1', () => {
      expect(JOB_PRIORITIES.HIGH).toBe(1);
    });

    it('should have NORMAL priority as 2', () => {
      expect(JOB_PRIORITIES.NORMAL).toBe(2);
    });

    it('should have LOW priority as 3', () => {
      expect(JOB_PRIORITIES.LOW).toBe(3);
    });

    it('should have priorities in correct order (lower is higher priority)', () => {
      expect(JOB_PRIORITIES.HIGH).toBeLessThan(JOB_PRIORITIES.NORMAL);
      expect(JOB_PRIORITIES.NORMAL).toBeLessThan(JOB_PRIORITIES.LOW);
    });
  });

  describe('SMTP_RATE_LIMITS', () => {
    it('should have gmail rate limit', () => {
      expect(SMTP_RATE_LIMITS.gmail).toBe(100);
    });

    it('should have outlook rate limit', () => {
      expect(SMTP_RATE_LIMITS.outlook).toBe(300);
    });

    it('should have yahoo rate limit', () => {
      expect(SMTP_RATE_LIMITS.yahoo).toBe(100);
    });

    it('should have sendgrid rate limit', () => {
      expect(SMTP_RATE_LIMITS.sendgrid).toBe(600);
    });

    it('should have mailgun rate limit', () => {
      expect(SMTP_RATE_LIMITS.mailgun).toBe(600);
    });

    it('should have ses rate limit', () => {
      expect(SMTP_RATE_LIMITS.ses).toBe(200);
    });

    it('should have zoho rate limit', () => {
      expect(SMTP_RATE_LIMITS.zoho).toBe(150);
    });

    it('should have custom rate limit', () => {
      expect(SMTP_RATE_LIMITS.custom).toBe(60);
    });

    it('should have all rate limits greater than 0', () => {
      Object.values(SMTP_RATE_LIMITS).forEach((limit) => {
        expect(limit).toBeGreaterThan(0);
      });
    });
  });

  describe('getSmtpRateLimit', () => {
    it('should return gmail rate limit for gmail', () => {
      expect(getSmtpRateLimit('gmail')).toBe(100);
    });

    it('should return rate limit case-insensitively', () => {
      expect(getSmtpRateLimit('Gmail')).toBe(100);
      expect(getSmtpRateLimit('GMAIL')).toBe(100);
    });

    it('should return sendgrid rate limit', () => {
      expect(getSmtpRateLimit('sendgrid')).toBe(600);
    });

    it('should return custom rate limit for unknown providers', () => {
      expect(getSmtpRateLimit('unknown')).toBe(60);
    });

    it('should return custom rate limit for empty string', () => {
      expect(getSmtpRateLimit('')).toBe(60);
    });

    it('should return outlook rate limit', () => {
      expect(getSmtpRateLimit('outlook')).toBe(300);
    });

    it('should return mailgun rate limit', () => {
      expect(getSmtpRateLimit('mailgun')).toBe(600);
    });

    it('should return ses rate limit', () => {
      expect(getSmtpRateLimit('ses')).toBe(200);
    });

    it('should return zoho rate limit', () => {
      expect(getSmtpRateLimit('zoho')).toBe(150);
    });
  });
});
