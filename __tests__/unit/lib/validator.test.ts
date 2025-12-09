import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateEmails,
  findDuplicates,
  removeDuplicates,
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
  });

  describe('validateEmails', () => {
    it('should validate list of emails and return results', () => {
      const emails = [
        'valid@example.com',
        'invalid',
        'another@valid.org',
      ];
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
  });
});
