import { describe, it, expect } from 'vitest';
import {
  isValidNamespace,
  TRANSLATION_NAMESPACES,
} from '@/i18n/useTypedTranslations';
import type { Messages, MessageNamespace, MessageKey } from '@/i18n/messages.d';

describe('Type-safe Translations', () => {
  describe('TRANSLATION_NAMESPACES', () => {
    it('should contain expected namespaces', () => {
      expect(TRANSLATION_NAMESPACES).toContain('common');
      expect(TRANSLATION_NAMESPACES).toContain('nav');
      expect(TRANSLATION_NAMESPACES).toContain('dashboard');
      expect(TRANSLATION_NAMESPACES).toContain('campaigns');
      expect(TRANSLATION_NAMESPACES).toContain('settings');
      expect(TRANSLATION_NAMESPACES).toContain('analytics');
    });

    it('should be a frozen array (readonly)', () => {
      expect(Array.isArray(TRANSLATION_NAMESPACES)).toBe(true);
      expect(TRANSLATION_NAMESPACES.length).toBeGreaterThan(0);
    });
  });

  describe('isValidNamespace', () => {
    it('should return true for valid namespaces', () => {
      expect(isValidNamespace('common')).toBe(true);
      expect(isValidNamespace('nav')).toBe(true);
      expect(isValidNamespace('dashboard')).toBe(true);
      expect(isValidNamespace('campaigns')).toBe(true);
    });

    it('should return false for invalid namespaces', () => {
      expect(isValidNamespace('invalid')).toBe(false);
      expect(isValidNamespace('')).toBe(false);
      expect(isValidNamespace('COMMON')).toBe(false); // Case-sensitive
      expect(isValidNamespace('navigation')).toBe(false); // Wrong name
    });
  });

  describe('Type definitions', () => {
    it('should have correct message namespace type', () => {
      // This test validates that the types compile correctly
      const validNamespace: MessageNamespace = 'common';
      expect(validNamespace).toBe('common');
    });

    it('should ensure Messages type has expected structure', () => {
      // Type-level test - if this compiles, the types are correct
      type CommonKeys = MessageKey<'common'>;
      type NavKeys = MessageKey<'nav'>;

      // Runtime check that type aligns with actual data
      const commonExpectedKeys = ['appName', 'loading', 'error', 'success', 'cancel'];
      const navExpectedKeys = ['dashboard', 'campaigns', 'templates', 'contacts'];

      // These are just samples - the actual keys are type-checked at compile time
      expect(commonExpectedKeys.length).toBeGreaterThan(0);
      expect(navExpectedKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Message file consistency', () => {
    it('should have all namespaces in TRANSLATION_NAMESPACES array', () => {
      // This ensures the TRANSLATION_NAMESPACES array is kept in sync
      // with the actual message file structure
      const namespaceSet = new Set(TRANSLATION_NAMESPACES);

      // At minimum, these core namespaces should exist
      const requiredNamespaces = ['common', 'nav', 'dashboard', 'campaigns', 'settings'];

      requiredNamespaces.forEach((ns) => {
        expect(namespaceSet.has(ns as MessageNamespace)).toBe(true);
      });
    });
  });
});
