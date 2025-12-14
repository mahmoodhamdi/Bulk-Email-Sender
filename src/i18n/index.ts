/**
 * i18n exports
 *
 * Central export point for internationalization utilities.
 */

// Configuration
export { locales, defaultLocale, localeNames, localeDirection, isRtl } from './config';
export type { Locale } from './config';

// Routing
export { routing } from './routing';

// Type-safe translations
export {
  useTypedTranslations,
  isValidNamespace,
  TRANSLATION_NAMESPACES,
} from './useTypedTranslations';
export type {
  Messages,
  MessageNamespace,
  MessageKey,
  TranslationPath,
  TranslationValues,
} from './messages.d';
export type {
  TranslationFunction,
  TranslationKeys,
  NestedTranslationKey,
} from './useTypedTranslations';
