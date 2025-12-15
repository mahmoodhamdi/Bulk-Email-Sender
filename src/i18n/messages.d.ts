/**
 * Type-safe translation keys for next-intl
 *
 * This file provides compile-time type checking for translation keys.
 * It uses the English messages file as the source of truth for types.
 */

import type en from '@/messages/en.json';

// Export the Messages type based on the English messages
export type Messages = typeof en;

// Extract namespace keys (top-level keys like 'common', 'nav', 'dashboard', etc.)
export type MessageNamespace = keyof Messages;

// Helper type to get nested keys for a specific namespace
export type NamespaceMessages<N extends MessageNamespace> = Messages[N];

// Helper type to get all possible keys within a namespace
export type MessageKey<N extends MessageNamespace> = keyof NamespaceMessages<N>;

// Utility type to get nested message paths (for deeply nested objects)
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? T[K] extends (infer U)[]
            ? K
            : `${K}` | `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

// Full path type for nested translations
export type TranslationPath<N extends MessageNamespace> = NestedKeyOf<NamespaceMessages<N>>;

// Type for interpolation values in translations
export type TranslationValues = Record<string, string | number | Date>;

// Declare module augmentation for next-intl
declare module 'next-intl' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
