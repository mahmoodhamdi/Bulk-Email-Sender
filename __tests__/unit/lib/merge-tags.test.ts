import { describe, it, expect } from 'vitest';
import {
  replaceMergeTags,
  extractMergeTags,
  validateMergeTags,
  getAvailableMergeTags,
  generateUnsubscribeLink,
  generateTrackingPixel,
  wrapLinksForTracking,
} from '@/lib/email/merge-tags';

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

    it('should use provided date if given', () => {
      const content = 'Date: {{date}}';
      const data = { date: 'January 1, 2025' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('Date: January 1, 2025');
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

    it('should handle tracking pixel tag', () => {
      const content = 'Content {{trackingPixel}}';
      const data = { trackingPixel: '<img src="/track/123" />' };
      const result = replaceMergeTags(content, data);
      expect(result).toContain('<img src="/track/123" />');
    });

    it('should handle content without tags', () => {
      const content = 'No tags here';
      const data = { firstName: 'John' };
      const result = replaceMergeTags(content, data);
      expect(result).toBe('No tags here');
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

    it('should extract multiple occurrences of different tags', () => {
      const content = '{{email}} {{firstName}} {{email}} {{lastName}}';
      const tags = extractMergeTags(content);
      expect(tags).toEqual(['email', 'firstName', 'lastName']);
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

    it('should be case-insensitive', () => {
      const tags = ['FIRSTNAME', 'LastName', 'EMAIL'];
      const result = validateMergeTags(tags);
      expect(result.valid).toBe(true);
    });

    it('should handle empty tags array', () => {
      const result = validateMergeTags([]);
      expect(result.valid).toBe(true);
      expect(result.invalidTags).toEqual([]);
    });

    it('should identify multiple invalid tags', () => {
      const tags = ['invalid1', 'invalid2', 'firstName'];
      const result = validateMergeTags(tags);
      expect(result.valid).toBe(false);
      expect(result.invalidTags).toContain('invalid1');
      expect(result.invalidTags).toContain('invalid2');
      expect(result.invalidTags.length).toBe(2);
    });
  });

  describe('getAvailableMergeTags', () => {
    it('should return all available merge tags', () => {
      const tags = getAvailableMergeTags();
      expect(tags).toContain('firstName');
      expect(tags).toContain('lastName');
      expect(tags).toContain('email');
      expect(tags).toContain('company');
      expect(tags).toContain('customField1');
      expect(tags).toContain('customField2');
      expect(tags).toContain('unsubscribeLink');
      expect(tags).toContain('date');
      expect(tags).toContain('trackingPixel');
    });

    it('should return 9 tags', () => {
      const tags = getAvailableMergeTags();
      expect(tags.length).toBe(9);
    });

    it('should return readonly array', () => {
      const tags = getAvailableMergeTags();
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  describe('generateUnsubscribeLink', () => {
    it('should generate unsubscribe link with token', () => {
      const link = generateUnsubscribeLink('abc123', 'https://example.com');
      expect(link).toContain('https://example.com/api/unsubscribe/abc123');
      expect(link).toContain('<a href=');
      expect(link).toContain('unsubscribe</a>');
    });

    it('should include styling in link', () => {
      const link = generateUnsubscribeLink('token', 'https://test.com');
      expect(link).toContain('style=');
      expect(link).toContain('color:');
    });

    it('should handle different base URLs', () => {
      const link = generateUnsubscribeLink('token', 'http://localhost:3000');
      expect(link).toContain('http://localhost:3000/api/unsubscribe/token');
    });
  });

  describe('generateTrackingPixel', () => {
    it('should generate tracking pixel image tag', () => {
      const pixel = generateTrackingPixel('track123', 'https://example.com');
      expect(pixel).toContain('https://example.com/api/track/open/track123');
      expect(pixel).toContain('<img');
      expect(pixel).toContain('width="1"');
      expect(pixel).toContain('height="1"');
    });

    it('should have display:none style', () => {
      const pixel = generateTrackingPixel('id', 'https://test.com');
      expect(pixel).toContain('display:none');
    });

    it('should have empty alt attribute', () => {
      const pixel = generateTrackingPixel('id', 'https://test.com');
      expect(pixel).toContain('alt=""');
    });
  });

  describe('wrapLinksForTracking', () => {
    it('should wrap regular links for tracking', () => {
      const content = '<a href="https://example.com">Click me</a>';
      const result = wrapLinksForTracking(content, 'track123', 'https://tracker.com');
      expect(result).toContain('https://tracker.com/api/track/click/track123');
      expect(result).toContain('url=' + encodeURIComponent('https://example.com'));
    });

    it('should not wrap unsubscribe links', () => {
      const content = '<a href="https://example.com/unsubscribe/token">Unsubscribe</a>';
      const result = wrapLinksForTracking(content, 'track123', 'https://tracker.com');
      expect(result).not.toContain('/api/track/click/');
      expect(result).toContain('/unsubscribe/token');
    });

    it('should not wrap already tracked links', () => {
      const content = '<a href="https://example.com/track/abc">Already tracked</a>';
      const result = wrapLinksForTracking(content, 'track123', 'https://tracker.com');
      expect(result).not.toContain('/api/track/click/track123');
    });

    it('should wrap multiple links', () => {
      const content = '<a href="https://one.com">One</a> and <a href="https://two.com">Two</a>';
      const result = wrapLinksForTracking(content, 'track', 'https://t.com');
      expect(result).toContain(encodeURIComponent('https://one.com'));
      expect(result).toContain(encodeURIComponent('https://two.com'));
    });

    it('should preserve link attributes', () => {
      const content = '<a href="https://example.com" class="btn" target="_blank">Link</a>';
      const result = wrapLinksForTracking(content, 'track', 'https://t.com');
      expect(result).toContain('class="btn"');
      expect(result).toContain('target="_blank"');
    });

    it('should handle content without links', () => {
      const content = 'No links here';
      const result = wrapLinksForTracking(content, 'track', 'https://t.com');
      expect(result).toBe('No links here');
    });

    it('should handle double quotes in href', () => {
      const content = '<a href="https://example.com/path">Link</a>';
      const result = wrapLinksForTracking(content, 'track', 'https://t.com');
      expect(result).toContain('/api/track/click/track');
    });
  });
});
