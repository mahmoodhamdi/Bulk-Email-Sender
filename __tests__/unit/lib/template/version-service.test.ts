import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateChangeSummary,
  hasChanges,
} from '@/lib/template/version-service';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    template: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    templateVersion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('Version Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateChangeSummary', () => {
    it('should return "No changes" when nothing changed', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = { ...oldData };

      expect(generateChangeSummary(oldData, newData)).toBe('No changes');
    });

    it('should detect single field change', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        ...oldData,
        name: 'New Name',
      };

      expect(generateChangeSummary(oldData, newData)).toBe('Updated name');
    });

    it('should detect two field changes', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        ...oldData,
        name: 'New Name',
        subject: 'New Subject',
      };

      expect(generateChangeSummary(oldData, newData)).toBe('Updated name and subject');
    });

    it('should detect multiple field changes', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        name: 'New Name',
        subject: 'New Subject',
        content: '<p>New Content</p>',
        category: 'newsletter',
      };

      expect(generateChangeSummary(oldData, newData)).toBe('Updated name, subject, and content');
    });

    it('should detect all field changes', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        name: 'New Name',
        subject: 'New Subject',
        content: '<p>New Content</p>',
        category: 'promotional',
      };

      expect(generateChangeSummary(oldData, newData)).toBe('Updated name, subject, content, and category');
    });

    it('should handle null values', () => {
      const oldData = {
        name: 'Test',
        subject: null,
        content: '<p>Content</p>',
        category: null,
      };
      const newData = {
        name: 'Test',
        subject: 'New Subject',
        content: '<p>Content</p>',
        category: null,
      };

      expect(generateChangeSummary(oldData, newData)).toBe('Updated subject');
    });
  });

  describe('hasChanges', () => {
    it('should return false when nothing changed', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = { ...oldData };

      expect(hasChanges(oldData, newData)).toBe(false);
    });

    it('should return true when name changed', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        ...oldData,
        name: 'New Name',
      };

      expect(hasChanges(oldData, newData)).toBe(true);
    });

    it('should return true when subject changed', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        ...oldData,
        subject: 'New Subject',
      };

      expect(hasChanges(oldData, newData)).toBe(true);
    });

    it('should return true when content changed', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        ...oldData,
        content: '<p>New Content</p>',
      };

      expect(hasChanges(oldData, newData)).toBe(true);
    });

    it('should return true when category changed', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        ...oldData,
        category: 'promotional',
      };

      expect(hasChanges(oldData, newData)).toBe(true);
    });

    it('should handle null to string change', () => {
      const oldData = {
        name: 'Test',
        subject: null,
        content: '<p>Content</p>',
        category: null,
      };
      const newData = {
        ...oldData,
        subject: 'New Subject',
      };

      expect(hasChanges(oldData, newData)).toBe(true);
    });

    it('should handle string to null change', () => {
      const oldData = {
        name: 'Test',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'newsletter',
      };
      const newData = {
        ...oldData,
        subject: null,
      };

      expect(hasChanges(oldData, newData)).toBe(true);
    });
  });
});
