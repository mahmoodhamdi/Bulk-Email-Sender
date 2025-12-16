import { describe, it, expect } from 'vitest';
import {
  listVersionsQuerySchema,
  compareVersionsQuerySchema,
  revertVersionSchema,
  versionNumberSchema,
} from '@/lib/validations/template-version';

describe('Template Version Validation Schemas', () => {
  describe('listVersionsQuerySchema', () => {
    it('should apply default values', () => {
      const result = listVersionsQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should parse string numbers', () => {
      const result = listVersionsQuerySchema.parse({
        page: '5',
        limit: '50',
      });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should enforce minimum page', () => {
      expect(() => listVersionsQuerySchema.parse({ page: '0' })).toThrow();
    });

    it('should enforce maximum limit', () => {
      expect(() => listVersionsQuerySchema.parse({ limit: '101' })).toThrow();
    });

    it('should enforce minimum limit', () => {
      expect(() => listVersionsQuerySchema.parse({ limit: '0' })).toThrow();
    });
  });

  describe('compareVersionsQuerySchema', () => {
    it('should parse valid version numbers', () => {
      const result = compareVersionsQuerySchema.parse({
        v1: '1',
        v2: '2',
      });
      expect(result.v1).toBe(1);
      expect(result.v2).toBe(2);
    });

    it('should parse integer inputs', () => {
      const result = compareVersionsQuerySchema.parse({
        v1: 1,
        v2: 3,
      });
      expect(result.v1).toBe(1);
      expect(result.v2).toBe(3);
    });

    it('should require v1', () => {
      expect(() => compareVersionsQuerySchema.parse({ v2: '2' })).toThrow();
    });

    it('should require v2', () => {
      expect(() => compareVersionsQuerySchema.parse({ v1: '1' })).toThrow();
    });

    it('should enforce minimum version number', () => {
      expect(() => compareVersionsQuerySchema.parse({ v1: '0', v2: '1' })).toThrow();
    });
  });

  describe('revertVersionSchema', () => {
    it('should accept empty object', () => {
      const result = revertVersionSchema.parse({});
      expect(result.changeSummary).toBeUndefined();
    });

    it('should accept changeSummary', () => {
      const result = revertVersionSchema.parse({
        changeSummary: 'Reverting due to bug',
      });
      expect(result.changeSummary).toBe('Reverting due to bug');
    });

    it('should enforce maximum changeSummary length', () => {
      const longSummary = 'a'.repeat(501);
      expect(() => revertVersionSchema.parse({ changeSummary: longSummary })).toThrow();
    });

    it('should accept maximum length changeSummary', () => {
      const maxSummary = 'a'.repeat(500);
      const result = revertVersionSchema.parse({ changeSummary: maxSummary });
      expect(result.changeSummary).toHaveLength(500);
    });
  });

  describe('versionNumberSchema', () => {
    it('should parse string version number', () => {
      const result = versionNumberSchema.parse({ version: '5' });
      expect(result.version).toBe(5);
    });

    it('should parse integer version number', () => {
      const result = versionNumberSchema.parse({ version: 10 });
      expect(result.version).toBe(10);
    });

    it('should require version', () => {
      expect(() => versionNumberSchema.parse({})).toThrow();
    });

    it('should enforce minimum version number', () => {
      expect(() => versionNumberSchema.parse({ version: '0' })).toThrow();
    });

    it('should accept version 1', () => {
      const result = versionNumberSchema.parse({ version: '1' });
      expect(result.version).toBe(1);
    });
  });
});
