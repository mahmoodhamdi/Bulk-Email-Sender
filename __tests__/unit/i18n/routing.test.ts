import { describe, it, expect } from 'vitest';
import { routing } from '@/i18n/routing';

describe('i18n Routing', () => {
  describe('routing configuration', () => {
    it('should have locales defined', () => {
      expect(routing.locales).toBeDefined();
      expect(Array.isArray(routing.locales)).toBe(true);
    });

    it('should include English and Arabic locales', () => {
      expect(routing.locales).toContain('en');
      expect(routing.locales).toContain('ar');
    });

    it('should have defaultLocale defined', () => {
      expect(routing.defaultLocale).toBeDefined();
      expect(routing.defaultLocale).toBe('en');
    });

    it('should have localePrefix defined', () => {
      expect(routing.localePrefix).toBe('as-needed');
    });
  });
});
