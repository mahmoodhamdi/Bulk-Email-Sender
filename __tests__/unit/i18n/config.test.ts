import { describe, it, expect } from 'vitest';
import {
  locales,
  defaultLocale,
  localeNames,
  localeDirection,
  isRtl,
  type Locale,
} from '@/i18n/config';

describe('i18n Config', () => {
  describe('locales', () => {
    it('should include English and Arabic locales', () => {
      expect(locales).toContain('en');
      expect(locales).toContain('ar');
    });

    it('should have exactly 2 locales', () => {
      expect(locales.length).toBe(2);
    });

    it('should be a readonly array', () => {
      expect(Array.isArray(locales)).toBe(true);
    });
  });

  describe('defaultLocale', () => {
    it('should be English', () => {
      expect(defaultLocale).toBe('en');
    });

    it('should be included in locales array', () => {
      expect(locales).toContain(defaultLocale);
    });
  });

  describe('localeNames', () => {
    it('should have English name for en locale', () => {
      expect(localeNames.en).toBe('English');
    });

    it('should have Arabic name for ar locale', () => {
      expect(localeNames.ar).toBe('العربية');
    });

    it('should have names for all locales', () => {
      for (const locale of locales) {
        expect(localeNames[locale]).toBeDefined();
        expect(typeof localeNames[locale]).toBe('string');
        expect(localeNames[locale].length).toBeGreaterThan(0);
      }
    });
  });

  describe('localeDirection', () => {
    it('should be ltr for English', () => {
      expect(localeDirection.en).toBe('ltr');
    });

    it('should be rtl for Arabic', () => {
      expect(localeDirection.ar).toBe('rtl');
    });

    it('should have directions for all locales', () => {
      for (const locale of locales) {
        expect(localeDirection[locale]).toBeDefined();
        expect(['ltr', 'rtl']).toContain(localeDirection[locale]);
      }
    });
  });

  describe('isRtl', () => {
    it('should return false for English', () => {
      expect(isRtl('en')).toBe(false);
    });

    it('should return true for Arabic', () => {
      expect(isRtl('ar')).toBe(true);
    });

    it('should work with all locales', () => {
      expect(isRtl('en' as Locale)).toBe(false);
      expect(isRtl('ar' as Locale)).toBe(true);
    });
  });
});
