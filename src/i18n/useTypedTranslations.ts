/**
 * Type-safe translation utilities
 *
 * Provides enhanced type checking for translation keys and values.
 */

import { useTranslations } from 'next-intl';
import type { Messages, MessageNamespace } from './messages.d';

// Re-export the typed useTranslations hook
export { useTranslations };

// Type for the translation function returned by useTranslations
export type TranslationFunction<N extends MessageNamespace> = ReturnType<
  typeof useTranslations<N>
>;

/**
 * Type-safe hook for translations within a specific namespace
 *
 * @example
 * ```tsx
 * const t = useTypedTranslations('common');
 * return <p>{t('loading')}</p>; // Type-checked!
 * ```
 */
export function useTypedTranslations<N extends MessageNamespace>(
  namespace: N
): TranslationFunction<N> {
  return useTranslations(namespace);
}

/**
 * Type helper to extract all valid translation keys for a namespace
 */
export type TranslationKeys<N extends MessageNamespace> = keyof Messages[N];

/**
 * Type helper for nested translation keys
 * Supports dot notation for deeply nested keys
 */
export type NestedTranslationKey<
  N extends MessageNamespace,
  K extends TranslationKeys<N> = TranslationKeys<N>
> = K extends string
  ? Messages[N][K] extends Record<string, unknown>
    ? `${K}.${NestedKey<Messages[N][K]>}` | K
    : K
  : never;

// Helper type for getting nested keys
type NestedKey<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends Record<string, unknown>
          ? `${K}.${NestedKey<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

/**
 * Available namespaces for translations
 */
export const TRANSLATION_NAMESPACES: readonly MessageNamespace[] = [
  'common',
  'nav',
  'dashboard',
  'campaigns',
  'campaign',
  'templates',
  'contacts',
  'settings',
  'analytics',
  'preview',
  'schedule',
  'errors',
  'footer',
  'meta',
  'segmentation',
  'abTest',
  'automation',
  'reputation',
  'unsubscribe',
  'apiDocs',
  'tracking',
] as const;

/**
 * Type guard to check if a string is a valid namespace
 */
export function isValidNamespace(value: string): value is MessageNamespace {
  return TRANSLATION_NAMESPACES.includes(value as MessageNamespace);
}
