import { describe, it, expect } from 'vitest';
import { replaceMergeTags, extractMergeTags, validateMergeTags } from '@/lib/email/merge-tags';

describe('Merge Tags', () => {
  describe('replaceMergeTags', () => {
    it('should replace firstName tag', () => {
      const content = 'Hello {{firstName}}!';
      const data = { firstName: 'John' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Hello John!');
    });

    it('should replace multiple tags', () => {
      const content = 'Hello {{firstName}} {{lastName}}!';
      const data = { firstName: 'John', lastName: 'Doe' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Hello John Doe!');
    });

    it('should replace email tag', () => {
      const content = 'Your email is {{email}}';
      const data = { email: 'john@example.com' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Your email is john@example.com');
    });

    it('should replace company tag', () => {
      const content = 'Welcome to {{company}}';
      const data = { company: 'Acme Inc' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Welcome to Acme Inc');
    });

    it('should replace custom fields', () => {
      const content = 'Custom: {{customField1}} and {{customField2}}';
      const data = { customField1: 'Value1', customField2: 'Value2' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Custom: Value1 and Value2');
    });

    it('should replace date tag with current date', () => {
      const content = 'Today is {{date}}';
      const data = {};
      const result = replaceMergeTags(content, data);
      expect(result).toContain('Today is');
      expect(result).not.toContain('{{date}}');
    });

    it('should handle missing tags with empty string', () => {
      const content = 'Hello {{firstName}}!';
      const data = {};
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Hello !');
    });

    it('should handle unsubscribe link', () => {
      const content = 'Click here to {{unsubscribeLink}}';
      const data = { unsubscribeLink: '<a href="/unsubscribe/token123">unsubscribe</a>' };
      const result = replaceMergeTags(content, data);
      expect(result).toContain('href="/unsubscribe/token123"');
    });

    it('should be case-insensitive for tag names', () => {
      const content = 'Hello {{FIRSTNAME}} {{FirstName}} {{firstname}}!';
      const data = { firstName: 'John' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Hello John John John!');
    });
  });

  describe('extractMergeTags', () => {
    it('should extract all merge tags from content', () => {
      const content = 'Hello {{firstName}} {{lastName}}, your email is {{email}}';
      const tags = extractMergeTags(content);
      expect(tags).toEqual(['firstName', 'lastName', 'email']);
    });

    it('should return empty array for content without tags', () => {
      const content = 'Hello World!';
      const tags = extractMergeTags(content);
      expect(tags).toEqual([]);
    });

    it('should return unique tags only', () => {
      const content = '{{firstName}} and {{firstName}} again';
      const tags = extractMergeTags(content);
      expect(tags).toEqual(['firstName']);
    });
  });

  describe('validateMergeTags', () => {
    it('should return true for valid tags', () => {
      const tags = ['firstName', 'lastName', 'email'];
      const result = validateMergeTags(tags);
      expect(result.valid).toBe(true);
      expect(result.invalidTags).toEqual([]);
    });

    it('should identify invalid tags', () => {
      const tags = ['firstName', 'invalidTag123', 'email'];
      const result = validateMergeTags(tags);
      expect(result.valid).toBe(false);
      expect(result.invalidTags).toContain('invalidTag123');
    });

    it('should accept all standard merge tags', () => {
      const validTags = [
        'firstName',
        'lastName',
        'email',
        'company',
        'customField1',
        'customField2',
        'unsubscribeLink',
        'date',
        'trackingPixel',
      ];
      const result = validateMergeTags(validTags);
      expect(result.valid).toBe(true);
    });
  });
});
