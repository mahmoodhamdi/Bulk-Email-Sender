import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateEmails,
  findDuplicates,
  removeDuplicates,
  parseEmailList,
  normalizeEmail,
  isValidDomain,
} from '@/lib/email/validator';

describe('Email Validator', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('a@b.co')).toBe(true);
      expect(validateEmail('test@sub.domain.example.com')).toBe(true);
    });

    it('should handle null and undefined', () => {
      expect(validateEmail(null as unknown as string)).toBe(false);
      expect(validateEmail(undefined as unknown as string)).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(validateEmail(123 as unknown as string)).toBe(false);
      expect(validateEmail({} as unknown as string)).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      expect(validateEmail('   ')).toBe(false);
      expect(validateEmail('\t')).toBe(false);
    });

    it('should trim and validate', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
    });
  });

  describe('validateEmails', () => {
    it('should validate list of emails and return results', () => {
      const emails = ['valid@example.com', 'invalid', 'another@valid.org'];
      const result = validateEmails(emails);

      expect(result.valid).toEqual(['valid@example.com', 'another@valid.org']);
      expect(result.invalid).toEqual(['invalid']);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
    });

    it('should handle empty list', () => {
      const result = validateEmails([]);
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(0);
    });

    it('should trim whitespace from emails', () => {
      const emails = [' test@example.com ', '  another@test.com'];
      const result = validateEmails(emails);
      expect(result.valid).toEqual(['test@example.com', 'another@test.com']);
    });

    it('should skip empty strings after trimming', () => {
      const emails = ['', '   ', 'valid@example.com'];
      const result = validateEmails(emails);
      expect(result.valid).toEqual(['valid@example.com']);
      expect(result.invalid).toEqual([]);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(0);
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicate emails', () => {
      const emails = [
        'test@example.com',
        'unique@example.com',
        'test@example.com',
        'another@test.com',
        'unique@example.com',
      ];
      const duplicates = findDuplicates(emails);
      expect(duplicates).toContain('test@example.com');
      expect(duplicates).toContain('unique@example.com');
      expect(duplicates).toHaveLength(2);
    });

    it('should return empty array if no duplicates', () => {
      const emails = ['a@test.com', 'b@test.com', 'c@test.com'];
      const duplicates = findDuplicates(emails);
      expect(duplicates).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const emails = ['Test@Example.com', 'test@example.com'];
      const duplicates = findDuplicates(emails);
      expect(duplicates).toHaveLength(1);
    });

    it('should handle empty list', () => {
      const duplicates = findDuplicates([]);
      expect(duplicates).toEqual([]);
    });

    it('should handle single email', () => {
      const duplicates = findDuplicates(['single@example.com']);
      expect(duplicates).toEqual([]);
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate emails keeping first occurrence', () => {
      const emails = [
        'first@test.com',
        'second@test.com',
        'first@test.com',
        'third@test.com',
      ];
      const result = removeDuplicates(emails);
      expect(result.unique).toEqual([
        'first@test.com',
        'second@test.com',
        'third@test.com',
      ]);
      expect(result.duplicatesRemoved).toBe(1);
    });

    it('should be case-insensitive', () => {
      const emails = ['Test@Example.com', 'test@example.com', 'TEST@EXAMPLE.COM'];
      const result = removeDuplicates(emails);
      expect(result.unique).toHaveLength(1);
      expect(result.duplicatesRemoved).toBe(2);
    });

    it('should handle empty list', () => {
      const result = removeDuplicates([]);
      expect(result.unique).toEqual([]);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it('should handle no duplicates', () => {
      const emails = ['a@test.com', 'b@test.com'];
      const result = removeDuplicates(emails);
      expect(result.unique).toEqual(['a@test.com', 'b@test.com']);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it('should trim emails', () => {
      const emails = [' test@test.com ', 'test@test.com'];
      const result = removeDuplicates(emails);
      expect(result.unique).toEqual(['test@test.com']);
      expect(result.duplicatesRemoved).toBe(1);
    });
  });

  describe('parseEmailList', () => {
    it('should parse newline-separated emails', () => {
      const text = 'email1@test.com\nemail2@test.com\nemail3@test.com';
      const emails = parseEmailList(text);
      expect(emails).toEqual(['email1@test.com', 'email2@test.com', 'email3@test.com']);
    });

    it('should parse comma-separated emails', () => {
      const text = 'email1@test.com, email2@test.com, email3@test.com';
      const emails = parseEmailList(text);
      expect(emails).toEqual(['email1@test.com', 'email2@test.com', 'email3@test.com']);
    });

    it('should parse mixed newlines and commas', () => {
      const text = 'email1@test.com, email2@test.com\nemail3@test.com';
      const emails = parseEmailList(text);
      expect(emails).toEqual(['email1@test.com', 'email2@test.com', 'email3@test.com']);
    });

    it('should handle carriage returns', () => {
      const text = 'email1@test.com\r\nemail2@test.com';
      const emails = parseEmailList(text);
      expect(emails).toEqual(['email1@test.com', 'email2@test.com']);
    });

    it('should trim whitespace', () => {
      const text = '  email1@test.com  ,  email2@test.com  ';
      const emails = parseEmailList(text);
      expect(emails).toEqual(['email1@test.com', 'email2@test.com']);
    });

    it('should filter empty entries', () => {
      const text = 'email1@test.com,,email2@test.com\n\nemail3@test.com';
      const emails = parseEmailList(text);
      expect(emails).toEqual(['email1@test.com', 'email2@test.com', 'email3@test.com']);
    });

    it('should handle empty string', () => {
      const emails = parseEmailList('');
      expect(emails).toEqual([]);
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase and trim email', () => {
      expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
      expect(normalizeEmail('  USER@TEST.COM  ')).toBe('user@test.com');
    });

    it('should handle already normalized email', () => {
      expect(normalizeEmail('test@example.com')).toBe('test@example.com');
    });
  });

  describe('isValidDomain', () => {
    it('should validate correct domains', () => {
      expect(isValidDomain('test@example.com')).toBe(true);
      expect(isValidDomain('user@sub-domain.org')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(isValidDomain('test@')).toBe(false);
      expect(isValidDomain('test')).toBe(false);
      expect(isValidDomain('@domain')).toBe(false);
    });

    it('should reject domains starting with hyphen', () => {
      expect(isValidDomain('test@-invalid.com')).toBe(false);
    });

    it('should reject domains without proper TLD', () => {
      expect(isValidDomain('test@domain')).toBe(false);
      expect(isValidDomain('test@domain.a')).toBe(false);
    });

    it('should accept domains with valid TLDs', () => {
      expect(isValidDomain('test@domain.co')).toBe(true);
      expect(isValidDomain('test@domain.com')).toBe(true);
      expect(isValidDomain('test@domain.org')).toBe(true);
    });
  });
});
