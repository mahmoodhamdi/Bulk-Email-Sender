import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateSecureId, generateShortId } from './crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatPercentage(num: number, decimals = 1): string {
  return `${num.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * RFC 5321 compliant email validation
 * More strict than the basic regex to catch common issues
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  // RFC 5321 compliant regex
  // Validates: local-part@domain.tld
  // - Local part: letters, numbers, and allowed special chars
  // - Domain: valid hostname with at least 2-char TLD
  const emailRegex =
    /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  return emailRegex.test(email.trim());
}

/**
 * Generate a cryptographically secure random ID
 * Uses Web Crypto API instead of Math.random()
 */
export function generateId(): string {
  return generateShortId(16);
}

/**
 * Generate a UUID v4 using crypto API
 */
export { generateSecureId, generateShortId };

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
