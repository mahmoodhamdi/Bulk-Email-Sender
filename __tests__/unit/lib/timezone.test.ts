import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TIMEZONES,
  getLocalTimezone,
  getTimezoneOffset,
  formatTimezoneOffset,
  formatTimezoneDisplay,
  createDateInTimezone,
  localToUTC,
  parseTimeInTimezone,
  formatInTimezone,
  getDatePartsInTimezone,
  isDST,
  getTimeUntil,
  isValidTimezone,
} from '@/lib/timezone';

describe('Timezone Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('TIMEZONES', () => {
    it('should contain UTC', () => {
      const utc = TIMEZONES.find(tz => tz.id === 'UTC');
      expect(utc).toBeDefined();
      expect(utc?.label).toBe('UTC');
    });

    it('should contain common US timezones', () => {
      expect(TIMEZONES.find(tz => tz.id === 'America/New_York')).toBeDefined();
      expect(TIMEZONES.find(tz => tz.id === 'America/Los_Angeles')).toBeDefined();
      expect(TIMEZONES.find(tz => tz.id === 'America/Chicago')).toBeDefined();
    });

    it('should contain common European timezones', () => {
      expect(TIMEZONES.find(tz => tz.id === 'Europe/London')).toBeDefined();
      expect(TIMEZONES.find(tz => tz.id === 'Europe/Paris')).toBeDefined();
      expect(TIMEZONES.find(tz => tz.id === 'Europe/Berlin')).toBeDefined();
    });

    it('should contain common Asian timezones', () => {
      expect(TIMEZONES.find(tz => tz.id === 'Asia/Tokyo')).toBeDefined();
      expect(TIMEZONES.find(tz => tz.id === 'Asia/Shanghai')).toBeDefined();
      expect(TIMEZONES.find(tz => tz.id === 'Asia/Dubai')).toBeDefined();
    });

    it('should have region property for each timezone', () => {
      TIMEZONES.forEach(tz => {
        expect(tz.region).toBeDefined();
        expect(typeof tz.region).toBe('string');
      });
    });
  });

  describe('getLocalTimezone', () => {
    it('should return a string', () => {
      const timezone = getLocalTimezone();
      expect(typeof timezone).toBe('string');
    });

    it('should return a valid IANA timezone', () => {
      const timezone = getLocalTimezone();
      // Should not throw when used with Intl
      expect(() => {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      }).not.toThrow();
    });
  });

  describe('getTimezoneOffset', () => {
    it('should return 0 for UTC', () => {
      const offset = getTimezoneOffset('UTC');
      expect(offset).toBe(0);
    });

    it('should return a number for valid timezone', () => {
      const offset = getTimezoneOffset('America/New_York');
      expect(typeof offset).toBe('number');
    });

    it('should return different offsets for different timezones', () => {
      const nyOffset = getTimezoneOffset('America/New_York');
      const laOffset = getTimezoneOffset('America/Los_Angeles');
      expect(nyOffset).not.toBe(laOffset);
    });

    it('should return 0 for invalid timezone', () => {
      const offset = getTimezoneOffset('Invalid/Timezone');
      expect(offset).toBe(0);
    });

    it('should use current date if not provided', () => {
      const offset = getTimezoneOffset('America/New_York');
      expect(typeof offset).toBe('number');
    });
  });

  describe('formatTimezoneOffset', () => {
    it('should return +00:00 for UTC', () => {
      const offset = formatTimezoneOffset('UTC');
      expect(offset).toBe('+00:00');
    });

    it('should return a formatted offset string', () => {
      const offset = formatTimezoneOffset('America/New_York');
      expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
    });

    it('should return +00:00 for invalid timezone', () => {
      const offset = formatTimezoneOffset('Invalid/Timezone');
      expect(offset).toBe('+00:00');
    });
  });

  describe('formatTimezoneDisplay', () => {
    it('should include timezone label for known timezone', () => {
      const display = formatTimezoneDisplay('America/New_York');
      expect(display).toContain('Eastern Time');
    });

    it('should include offset in parentheses', () => {
      const display = formatTimezoneDisplay('UTC');
      expect(display).toMatch(/UTC \([+-]\d{2}:\d{2}\)/);
    });

    it('should use timezone ID for unknown timezone', () => {
      const display = formatTimezoneDisplay('Pacific/Midway');
      expect(display).toContain('Pacific/Midway');
    });
  });

  describe('createDateInTimezone', () => {
    it('should create a date in the specified timezone', () => {
      const date = createDateInTimezone(2024, 6, 15, 12, 0, 'UTC');
      expect(date).toBeInstanceOf(Date);
    });

    it('should handle different timezones', () => {
      const utcDate = createDateInTimezone(2024, 6, 15, 12, 0, 'UTC');
      const nyDate = createDateInTimezone(2024, 6, 15, 12, 0, 'America/New_York');
      expect(utcDate.getTime()).not.toBe(nyDate.getTime());
    });
  });

  describe('localToUTC', () => {
    it('should convert local time to UTC', () => {
      const localDate = new Date(2024, 5, 15, 12, 0, 0);
      const utcDate = localToUTC(localDate, 'UTC');
      expect(utcDate).toBeInstanceOf(Date);
    });
  });

  describe('parseTimeInTimezone', () => {
    it('should parse time string correctly', () => {
      const date = new Date(2024, 5, 15);
      const result = parseTimeInTimezone(date, '14:30', 'UTC');
      expect(result).toBeInstanceOf(Date);
    });

    it('should throw for invalid time format', () => {
      const date = new Date(2024, 5, 15);
      expect(() => {
        parseTimeInTimezone(date, 'invalid', 'UTC');
      }).toThrow('Invalid time string format');
    });

    it('should throw for partial time format', () => {
      const date = new Date(2024, 5, 15);
      expect(() => {
        parseTimeInTimezone(date, '14', 'UTC');
      }).toThrow('Invalid time string format');
    });
  });

  describe('formatInTimezone', () => {
    it('should format date in specified timezone', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const formatted = formatInTimezone(date, 'UTC');
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2024');
    });

    it('should use custom format options', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const formatted = formatInTimezone(date, 'UTC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should return ISO string for invalid timezone', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const formatted = formatInTimezone(date, 'Invalid/Timezone');
      expect(formatted).toContain('2024');
    });
  });

  describe('getDatePartsInTimezone', () => {
    it('should return all date parts', () => {
      const date = new Date('2024-06-15T12:30:00Z');
      const parts = getDatePartsInTimezone(date, 'UTC');
      expect(parts).toHaveProperty('year');
      expect(parts).toHaveProperty('month');
      expect(parts).toHaveProperty('day');
      expect(parts).toHaveProperty('hours');
      expect(parts).toHaveProperty('minutes');
    });

    it('should return correct UTC values', () => {
      const date = new Date('2024-06-15T12:30:00Z');
      const parts = getDatePartsInTimezone(date, 'UTC');
      expect(parts.year).toBe(2024);
      expect(parts.month).toBe(6);
      expect(parts.day).toBe(15);
      expect(parts.hours).toBe(12);
      expect(parts.minutes).toBe(30);
    });
  });

  describe('isDST', () => {
    it('should return a boolean', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const result = isDST(date, 'America/New_York');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for UTC (no DST)', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const result = isDST(date, 'UTC');
      expect(result).toBe(false);
    });
  });

  describe('getTimeUntil', () => {
    it('should return null for past date', () => {
      vi.useRealTimers();
      const pastDate = new Date(Date.now() - 1000);
      const result = getTimeUntil(pastDate);
      expect(result).toBeNull();
    });

    it('should return time components for future date', () => {
      vi.useRealTimers();
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 30 * 60 * 1000);
      const result = getTimeUntil(futureDate);
      expect(result).not.toBeNull();
      expect(result?.days).toBe(2);
      expect(result?.hours).toBe(3);
      expect(result?.minutes).toBe(30);
    });

    it('should return correct minutes', () => {
      vi.useRealTimers();
      const futureDate = new Date(Date.now() + 45 * 60 * 1000);
      const result = getTimeUntil(futureDate);
      expect(result).not.toBeNull();
      expect(result?.days).toBe(0);
      expect(result?.hours).toBe(0);
      expect(result?.minutes).toBe(45);
    });
  });

  describe('isValidTimezone', () => {
    it('should return true for valid timezone', () => {
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
    });

    it('should return false for invalid timezone', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('Not/A/Timezone')).toBe(false);
    });

    it('should return false for undefined-like values', () => {
      expect(isValidTimezone('undefined')).toBe(false);
      expect(isValidTimezone('null')).toBe(false);
    });
  });
});
