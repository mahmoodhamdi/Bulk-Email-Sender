import { describe, it, expect } from 'vitest';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdSchema,
  listTemplatesSchema,
  duplicateTemplateSchema,
  previewTemplateSchema,
} from '@/lib/validations/template';

describe('Template Validation Schemas', () => {
  describe('createTemplateSchema', () => {
    const validTemplate = {
      name: 'Test Template',
      content: '<p>Hello {{firstName}}</p>',
    };

    it('should accept valid template with minimal data', () => {
      const result = createTemplateSchema.parse(validTemplate);
      expect(result.name).toBe('Test Template');
      expect(result.content).toBe('<p>Hello {{firstName}}</p>');
      expect(result.isDefault).toBe(false);
    });

    it('should accept valid template with all fields', () => {
      const fullTemplate = {
        name: 'Newsletter Template',
        subject: 'Monthly Newsletter',
        content: '<p>Hello {{firstName}}</p>',
        thumbnail: 'https://example.com/thumb.png',
        category: 'marketing',
        isDefault: true,
      };
      const result = createTemplateSchema.parse(fullTemplate);
      expect(result.name).toBe('Newsletter Template');
      expect(result.subject).toBe('Monthly Newsletter');
      expect(result.thumbnail).toBe('https://example.com/thumb.png');
      expect(result.category).toBe('marketing');
      expect(result.isDefault).toBe(true);
    });

    it('should reject empty name', () => {
      expect(() => createTemplateSchema.parse({ ...validTemplate, name: '' })).toThrow();
    });

    it('should reject name over 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => createTemplateSchema.parse({ ...validTemplate, name: longName })).toThrow();
    });

    it('should reject empty content', () => {
      expect(() => createTemplateSchema.parse({ ...validTemplate, content: '' })).toThrow();
    });

    it('should reject subject over 998 characters', () => {
      const longSubject = 'a'.repeat(999);
      expect(() => createTemplateSchema.parse({ ...validTemplate, subject: longSubject })).toThrow();
    });

    it('should reject invalid thumbnail URL', () => {
      expect(() => createTemplateSchema.parse({ ...validTemplate, thumbnail: 'not-a-url' })).toThrow();
    });

    it('should accept null values for optional fields', () => {
      const result = createTemplateSchema.parse({
        ...validTemplate,
        subject: null,
        thumbnail: null,
        category: null,
      });
      expect(result.subject).toBeNull();
      expect(result.thumbnail).toBeNull();
      expect(result.category).toBeNull();
    });

    it('should reject category over 100 characters', () => {
      const longCategory = 'a'.repeat(101);
      expect(() => createTemplateSchema.parse({ ...validTemplate, category: longCategory })).toThrow();
    });
  });

  describe('updateTemplateSchema', () => {
    it('should accept partial updates', () => {
      const result = updateTemplateSchema.parse({ name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('should accept empty object', () => {
      const result = updateTemplateSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept content update', () => {
      const result = updateTemplateSchema.parse({ content: '<p>New content</p>' });
      expect(result.content).toBe('<p>New content</p>');
    });

    it('should accept isDefault update', () => {
      const result = updateTemplateSchema.parse({ isDefault: true });
      expect(result.isDefault).toBe(true);
    });

    it('should accept category update', () => {
      const result = updateTemplateSchema.parse({ category: 'transactional' });
      expect(result.category).toBe('transactional');
    });

    it('should reject invalid thumbnail URL in update', () => {
      expect(() => updateTemplateSchema.parse({ thumbnail: 'invalid-url' })).toThrow();
    });

    it('should accept null values for optional fields', () => {
      const result = updateTemplateSchema.parse({ subject: null, category: null });
      expect(result.subject).toBeNull();
      expect(result.category).toBeNull();
    });
  });

  describe('templateIdSchema', () => {
    it('should accept valid ID', () => {
      const result = templateIdSchema.parse({ id: 'clxxxxxxxxxxxxxxxxxx' });
      expect(result.id).toBe('clxxxxxxxxxxxxxxxxxx');
    });

    it('should reject empty ID', () => {
      expect(() => templateIdSchema.parse({ id: '' })).toThrow();
    });

    it('should reject missing ID', () => {
      expect(() => templateIdSchema.parse({})).toThrow();
    });
  });

  describe('listTemplatesSchema', () => {
    it('should use defaults for empty object', () => {
      const result = listTemplatesSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers', () => {
      const result = listTemplatesSchema.parse({ page: '3', limit: '20' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
    });

    it('should reject limit over 100', () => {
      expect(() => listTemplatesSchema.parse({ limit: '101' })).toThrow();
    });

    it('should accept category filter', () => {
      const result = listTemplatesSchema.parse({ category: 'marketing' });
      expect(result.category).toBe('marketing');
    });

    it('should accept search filter', () => {
      const result = listTemplatesSchema.parse({ search: 'newsletter' });
      expect(result.search).toBe('newsletter');
    });

    it('should accept isDefault filter', () => {
      const result = listTemplatesSchema.parse({ isDefault: 'true' });
      expect(result.isDefault).toBe(true);
    });

    it('should accept valid sortBy values', () => {
      const validSortBy = ['name', 'category', 'createdAt', 'updatedAt'];
      validSortBy.forEach((sortBy) => {
        expect(() => listTemplatesSchema.parse({ sortBy })).not.toThrow();
      });
    });

    it('should reject invalid sortBy value', () => {
      expect(() => listTemplatesSchema.parse({ sortBy: 'invalid' })).toThrow();
    });

    it('should reject search over 255 characters', () => {
      const longSearch = 'a'.repeat(256);
      expect(() => listTemplatesSchema.parse({ search: longSearch })).toThrow();
    });

    it('should reject category over 100 characters', () => {
      const longCategory = 'a'.repeat(101);
      expect(() => listTemplatesSchema.parse({ category: longCategory })).toThrow();
    });
  });

  describe('duplicateTemplateSchema', () => {
    it('should accept valid name', () => {
      const result = duplicateTemplateSchema.parse({ name: 'Copy of Template' });
      expect(result.name).toBe('Copy of Template');
    });

    it('should reject empty name', () => {
      expect(() => duplicateTemplateSchema.parse({ name: '' })).toThrow();
    });

    it('should reject name over 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => duplicateTemplateSchema.parse({ name: longName })).toThrow();
    });

    it('should reject missing name', () => {
      expect(() => duplicateTemplateSchema.parse({})).toThrow();
    });
  });

  describe('previewTemplateSchema', () => {
    it('should accept valid preview request', () => {
      const result = previewTemplateSchema.parse({
        content: '<p>Hello {{firstName}}</p>',
      });
      expect(result.content).toBe('<p>Hello {{firstName}}</p>');
    });

    it('should accept preview with data', () => {
      const result = previewTemplateSchema.parse({
        content: '<p>Hello {{firstName}}</p>',
        data: { firstName: 'John', lastName: 'Doe' },
      });
      expect(result.content).toBe('<p>Hello {{firstName}}</p>');
      expect(result.data).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('should reject empty content', () => {
      expect(() => previewTemplateSchema.parse({ content: '' })).toThrow();
    });

    it('should reject missing content', () => {
      expect(() => previewTemplateSchema.parse({})).toThrow();
    });

    it('should accept data with mixed types', () => {
      const result = previewTemplateSchema.parse({
        content: '<p>Test</p>',
        data: {
          name: 'John',
          count: 42,
          active: true,
          items: ['a', 'b'],
        },
      });
      expect(result.data?.count).toBe(42);
      expect(result.data?.active).toBe(true);
    });
  });
});
