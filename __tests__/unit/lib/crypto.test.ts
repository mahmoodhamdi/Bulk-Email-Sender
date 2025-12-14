import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSecureId,
  generateShortId,
  obfuscate,
  deobfuscate,
  escapeHtml,
  escapeCSV,
  sanitizeUrl,
  sanitizeHtml,
  sanitizeEmailPreview,
} from '@/lib/crypto';

describe('Crypto Utilities', () => {
  describe('generateSecureId', () => {
    it('should generate a non-empty string id', () => {
      const id = generateSecureId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSecureId());
      }
      expect(ids.size).toBe(100);
    });

    it('should add prefix when provided', () => {
      const id = generateSecureId('prefix-');
      expect(id.startsWith('prefix-')).toBe(true);
    });
  });

  describe('generateShortId', () => {
    it('should generate id of specified length', () => {
      expect(generateShortId(8).length).toBe(8);
      expect(generateShortId(12).length).toBe(12);
      expect(generateShortId(16).length).toBe(16);
    });

    it('should default to 12 characters', () => {
      expect(generateShortId().length).toBe(12);
    });

    it('should generate hexadecimal characters', () => {
      const id = generateShortId();
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });
  });

  describe('obfuscate and deobfuscate', () => {
    it('should round-trip text correctly', () => {
      const original = 'secret password 123!@#';
      const obfuscated = obfuscate(original);
      const recovered = deobfuscate(obfuscated);
      expect(recovered).toBe(original);
    });

    it('should produce different output than input', () => {
      const original = 'test';
      const obfuscated = obfuscate(original);
      expect(obfuscated).not.toBe(original);
    });

    it('should handle empty strings', () => {
      expect(obfuscate('')).toBe('');
      expect(deobfuscate('')).toBe('');
    });

    it('should handle ASCII special characters', () => {
      const original = 'Hello!@#$%^&*()_+-=[]{}|;:,.<>?';
      const obfuscated = obfuscate(original);
      const recovered = deobfuscate(obfuscated);
      expect(recovered).toBe(original);
    });

    it('should return empty string for invalid input', () => {
      expect(deobfuscate('not-valid-base64!@#')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(null as unknown as string)).toBe('');
      expect(escapeHtml(undefined as unknown as string)).toBe('');
    });

    it('should not modify safe strings', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('escapeCSV', () => {
    it('should wrap values with commas in quotes', () => {
      expect(escapeCSV('hello, world')).toBe('"hello, world"');
    });

    it('should escape double quotes', () => {
      expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
    });

    it('should wrap values with newlines in quotes', () => {
      expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should prefix formula-like values with single quote', () => {
      // All values starting with =, +, -, @ are prefixed with single quote
      expect(escapeCSV('=SUM(A1)')).toBe("\"'=SUM(A1)\"");
      expect(escapeCSV('+1234')).toBe("\"'+1234\"");
      expect(escapeCSV('-1234')).toBe("\"'-1234\"");
      expect(escapeCSV('@import')).toBe("\"'@import\"");
    });

    it('should handle null and undefined', () => {
      expect(escapeCSV(null)).toBe('');
      expect(escapeCSV(undefined)).toBe('');
    });

    it('should not modify simple values', () => {
      expect(escapeCSV('hello')).toBe('hello');
      expect(escapeCSV(123)).toBe('123');
    });
  });

  describe('sanitizeUrl', () => {
    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    });

    it('should allow safe URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    });

    it('should handle empty strings', () => {
      expect(sanitizeUrl('')).toBe('');
    });

    it('should handle whitespace', () => {
      expect(sanitizeUrl('  javascript:alert(1)  ')).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('should strip script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should strip event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });

    it('should strip iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<iframe');
    });

    it('should allow safe tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toBe('<p>Hello <strong>World</strong></p>');
    });

    it('should allow links with safe href', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('should strip javascript: in href', () => {
      const input = '<a href="javascript:alert(1)">Bad Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should allow images with safe src', () => {
      const input = '<img src="https://example.com/image.png" alt="Test">';
      const result = sanitizeHtml(input);
      expect(result).toContain('src="https://example.com/image.png"');
      expect(result).toContain('alt="Test"');
    });

    it('should allow tables', () => {
      const input = '<table><tr><td>Cell</td></tr></table>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<table>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<td>Cell</td>');
    });

    it('should allow style attributes', () => {
      const input = '<p style="color: red;">Red text</p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('style="color: red;"');
    });

    it('should strip form elements', () => {
      const input = '<form action="evil"><input type="text"><button>Submit</button></form>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
      expect(result).not.toContain('<button');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeHtml(null as unknown as string)).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeEmailPreview', () => {
    it('should replace merge tags with sample data', () => {
      const input = 'Hello {{firstName}} {{lastName}}!';
      const result = sanitizeEmailPreview(input);
      expect(result).toContain('John');
      expect(result).toContain('Doe');
      expect(result).not.toContain('{{firstName}}');
      expect(result).not.toContain('{{lastName}}');
    });

    it('should replace email merge tag', () => {
      const input = 'Contact: {{email}}';
      const result = sanitizeEmailPreview(input);
      expect(result).toContain('john@example.com');
    });

    it('should replace company merge tag', () => {
      const input = 'Company: {{company}}';
      const result = sanitizeEmailPreview(input);
      expect(result).toContain('Acme Inc');
    });

    it('should replace date merge tag', () => {
      const input = 'Date: {{date}}';
      const result = sanitizeEmailPreview(input);
      expect(result).not.toContain('{{date}}');
    });

    it('should use custom sample data when provided', () => {
      const input = 'Hello {{firstName}} from {{company}}!';
      const result = sanitizeEmailPreview(input, {
        firstName: 'Jane',
        company: 'TechCorp',
      });
      expect(result).toContain('Jane');
      expect(result).toContain('TechCorp');
    });

    it('should escape sample data to prevent XSS', () => {
      const input = 'Hello {{firstName}}!';
      const result = sanitizeEmailPreview(input, {
        firstName: '<script>alert(1)</script>',
      });
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should sanitize HTML in template', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeEmailPreview(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should handle empty strings', () => {
      expect(sanitizeEmailPreview('')).toBe('');
    });
  });
});
