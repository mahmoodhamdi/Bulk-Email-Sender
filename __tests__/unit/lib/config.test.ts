import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConfig, getContactDisplay, hasContactInfo } from '@/lib/config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return default values when env vars are not set', () => {
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
      delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
      delete process.env.NEXT_PUBLIC_CONTACT_PHONE;

      const config = getConfig();

      expect(config.contact.email).toBe('');
      expect(config.contact.supportEmail).toBe('');
      expect(config.contact.phone).toBe('');
    });

    it('should return contact info from env vars', () => {
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = 'test@example.com';
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'support@example.com';
      process.env.NEXT_PUBLIC_CONTACT_PHONE = '+1234567890';

      const config = getConfig();

      expect(config.contact.email).toBe('test@example.com');
      expect(config.contact.supportEmail).toBe('support@example.com');
      expect(config.contact.phone).toBe('+1234567890');
    });

    it('should return default app URL when not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const config = getConfig();

      expect(config.urls.app).toBe('http://localhost:3000');
    });

    it('should return app URL from env var', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';

      const config = getConfig();

      expect(config.urls.app).toBe('https://myapp.com');
    });

    it('should return default tracking URL when not set', () => {
      delete process.env.TRACKING_URL;

      const config = getConfig();

      expect(config.urls.tracking).toBe('http://localhost:3000/api/track');
    });

    it('should have tracking features enabled by default', () => {
      delete process.env.NEXT_PUBLIC_TRACK_OPENS;
      delete process.env.NEXT_PUBLIC_TRACK_CLICKS;

      const config = getConfig();

      expect(config.features.trackOpens).toBe(true);
      expect(config.features.trackClicks).toBe(true);
    });

    it('should disable tracking when set to false', () => {
      process.env.NEXT_PUBLIC_TRACK_OPENS = 'false';
      process.env.NEXT_PUBLIC_TRACK_CLICKS = 'false';

      const config = getConfig();

      expect(config.features.trackOpens).toBe(false);
      expect(config.features.trackClicks).toBe(false);
    });
  });

  describe('getContactDisplay', () => {
    it('should return empty string when no contact info is set', () => {
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
      delete process.env.NEXT_PUBLIC_CONTACT_PHONE;

      expect(getContactDisplay()).toBe('');
    });

    it('should return email only when phone is not set', () => {
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = 'test@example.com';
      delete process.env.NEXT_PUBLIC_CONTACT_PHONE;

      expect(getContactDisplay()).toBe('test@example.com');
    });

    it('should return phone only when email is not set', () => {
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
      process.env.NEXT_PUBLIC_CONTACT_PHONE = '+1234567890';

      expect(getContactDisplay()).toBe('+1234567890');
    });

    it('should return email and phone separated by pipe', () => {
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = 'test@example.com';
      process.env.NEXT_PUBLIC_CONTACT_PHONE = '+1234567890';

      expect(getContactDisplay()).toBe('test@example.com | +1234567890');
    });
  });

  describe('hasContactInfo', () => {
    it('should return false when no contact info is set', () => {
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
      delete process.env.NEXT_PUBLIC_CONTACT_PHONE;

      expect(hasContactInfo()).toBe(false);
    });

    it('should return true when email is set', () => {
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = 'test@example.com';
      delete process.env.NEXT_PUBLIC_CONTACT_PHONE;

      expect(hasContactInfo()).toBe(true);
    });

    it('should return true when phone is set', () => {
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
      process.env.NEXT_PUBLIC_CONTACT_PHONE = '+1234567890';

      expect(hasContactInfo()).toBe(true);
    });

    it('should return true when both are set', () => {
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = 'test@example.com';
      process.env.NEXT_PUBLIC_CONTACT_PHONE = '+1234567890';

      expect(hasContactInfo()).toBe(true);
    });
  });
});
