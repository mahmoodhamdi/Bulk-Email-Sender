import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime,
  truncate,
  isValidEmail,
  generateId,
  sleep,
} from '@/lib/utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
      expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle empty strings', () => {
      expect(cn('', 'foo', '', 'bar', '')).toBe('foo bar');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects with boolean values', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with locale separators', () => {
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234');
    });

    it('should handle decimal numbers', () => {
      const result = formatNumber(1234.56);
      expect(result).toContain('1,234');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(50)).toBe('50.0%');
      expect(formatPercentage(33.333)).toBe('33.3%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(33.3333, 2)).toBe('33.33%');
      expect(formatPercentage(100, 0)).toBe('100%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-5.5)).toBe('-5.5%');
    });
  });

  describe('formatDate', () => {
    it('should format Date object with default locale', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date string', () => {
      const result = formatDate('2024-12-25');
      expect(result).toContain('Dec');
      expect(result).toContain('25');
      expect(result).toContain('2024');
    });

    it('should format with Arabic locale', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'ar');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format with English locale', () => {
      const date = new Date('2024-06-20');
      const result = formatDate(date, 'en');
      expect(result).toContain('Jun');
      expect(result).toContain('20');
    });
  });

  describe('formatDateTime', () => {
    it('should format Date object with time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date string with time', () => {
      const result = formatDateTime('2024-12-25T10:00:00');
      expect(result).toContain('Dec');
      expect(result).toContain('25');
    });

    it('should format with Arabic locale', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date, 'ar');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const result = truncate('This is a very long string', 10);
      expect(result).toBe('This is a ...');
      expect(result.length).toBe(13);
    });

    it('should not truncate short strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should not truncate strings at exact length', () => {
      expect(truncate('Exact', 5)).toBe('Exact');
    });

    it('should handle empty strings', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle single character truncation', () => {
      expect(truncate('Hello', 1)).toBe('H...');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.co')).toBe(true);
      expect(isValidEmail('test@sub.domain.example.com')).toBe(true);
    });
  });

  describe('generateId', () => {
    it('should generate a non-empty string id', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate alphanumeric ids', () => {
      const id = generateId();
      expect(/^[a-z0-9]+$/.test(id)).toBe(true);
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return a promise', () => {
      const result = sleep(100);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve after specified time', async () => {
      let resolved = false;
      const promise = sleep(1000).then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(500);
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(500);
      await promise;
      expect(resolved).toBe(true);
    });

    it('should resolve immediately for 0ms', async () => {
      let resolved = false;
      const promise = sleep(0).then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(0);
      await promise;
      expect(resolved).toBe(true);
    });
  });
});
