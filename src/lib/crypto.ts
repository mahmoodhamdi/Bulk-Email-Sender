/**
 * Cryptographic utilities for secure operations
 */

// Check if we're in a browser or Node environment
const isBrowser = typeof window !== 'undefined' && window.crypto;

/**
 * Generate a cryptographically secure random ID
 * Uses Web Crypto API for security
 */
export function generateSecureId(prefix = ''): string {
  if (isBrowser) {
    return `${prefix}${crypto.randomUUID()}`;
  }
  // Fallback for SSR - still cryptographically secure
  const array = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Node.js fallback
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return `${prefix}${Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Generate a shorter secure ID (12 characters)
 */
export function generateShortId(length = 12): string {
  const array = new Uint8Array(Math.ceil(length / 2));
  if (isBrowser) {
    crypto.getRandomValues(array);
  } else if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * Simple XOR-based obfuscation for client-side storage
 * NOTE: This is NOT strong encryption - for sensitive data, use server-side storage
 * This provides basic protection against casual inspection of localStorage
 */
const OBFUSCATION_KEY = 'bulk-email-sender-key-v1';

function getObfuscationKey(): number[] {
  return OBFUSCATION_KEY.split('').map((c) => c.charCodeAt(0));
}

/**
 * Obfuscate a string for storage
 * WARNING: This is NOT cryptographically secure encryption
 * For production, store credentials server-side only
 */
export function obfuscate(plaintext: string): string {
  if (!plaintext) return '';
  const key = getObfuscationKey();
  const result: number[] = [];
  for (let i = 0; i < plaintext.length; i++) {
    result.push(plaintext.charCodeAt(i) ^ key[i % key.length]);
  }
  return btoa(String.fromCharCode(...result));
}

/**
 * Deobfuscate a stored string
 */
export function deobfuscate(obfuscated: string): string {
  if (!obfuscated) return '';
  try {
    const key = getObfuscationKey();
    const decoded = atob(obfuscated);
    const result: string[] = [];
    for (let i = 0; i < decoded.length; i++) {
      result.push(String.fromCharCode(decoded.charCodeAt(i) ^ key[i % key.length]));
    }
    return result.join('');
  } catch {
    return '';
  }
}

/**
 * Hash a string using SHA-256 (async, for browser)
 */
export async function hashString(str: string): Promise<string> {
  if (isBrowser) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback - just return a basic hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * HTML escape special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Escape special characters for CSV to prevent formula injection
 */
export function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);

  // Check for formula injection (cells starting with =, +, -, @, or tab/carriage return)
  const needsQuoting =
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    /^[=+\-@\t\r]/.test(str);

  if (needsQuoting) {
    // Escape double quotes by doubling them and wrap in quotes
    // Prefix with single quote to prevent formula interpretation
    const escaped = str.replace(/"/g, '""');
    if (/^[=+\-@]/.test(str)) {
      return `"'${escaped}"`;
    }
    return `"${escaped}"`;
  }
  return str;
}

/**
 * Validate and sanitize URL to prevent javascript: and data: attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }

  return url;
}
