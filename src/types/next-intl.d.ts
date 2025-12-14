/**
 * Type-safe translations for next-intl
 *
 * This file augments the next-intl module to provide type checking
 * for translation keys based on the English messages file.
 */

import en from '@/messages/en.json';

type Messages = typeof en;

declare module 'next-intl' {
  interface IntlMessages extends Messages {}
}
