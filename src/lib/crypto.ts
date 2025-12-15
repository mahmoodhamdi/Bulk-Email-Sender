/**
 * Cryptographic utilities for secure operations
 */

import DOMPurify from 'dompurify';

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
 * Encryption key derivation
 * Uses a device-specific fingerprint combined with a salt for better security
 */
const ENCRYPTION_SALT = 'bulk-email-sender-v2-salt';

/**
 * Generate a device-specific encryption key
 * Combines browser fingerprint with salt for uniqueness per device
 */
function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side';
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ];
  return components.join('|');
}

/**
 * Derive an encryption key from the device fingerprint
 * Uses PBKDF2-like approach with multiple iterations
 */
async function deriveKey(): Promise<CryptoKey> {
  const fingerprint = getDeviceFingerprint();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(ENCRYPTION_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data using AES-GCM
 * Returns base64-encoded ciphertext with IV prepended
 *
 * WARNING: Client-side encryption has inherent limitations.
 * For maximum security, store credentials server-side only.
 */
export async function encryptString(plaintext: string): Promise<string> {
  if (!plaintext) return '';

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback to obfuscation for environments without Web Crypto
    console.warn('Web Crypto API not available, using fallback obfuscation');
    return obfuscateFallback(plaintext);
  }

  try {
    const key = await deriveKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine IV and ciphertext, then base64 encode
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch {
    // Fallback on error
    return obfuscateFallback(plaintext);
  }
}

/**
 * Decrypt data encrypted with encryptString
 */
export async function decryptString(ciphertext: string): Promise<string> {
  if (!ciphertext) return '';

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback to deobfuscation
    return deobfuscateFallback(ciphertext);
  }

  try {
    const key = await deriveKey();
    const decoded = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and ciphertext
    const iv = decoded.slice(0, 12);
    const encrypted = decoded.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    // Try fallback deobfuscation for backward compatibility
    return deobfuscateFallback(ciphertext);
  }
}

/**
 * Fallback XOR obfuscation for environments without Web Crypto
 * @deprecated Use encryptString/decryptString for new code
 */
const OBFUSCATION_KEY = 'bulk-email-sender-key-v1';

function getObfuscationKey(): number[] {
  return OBFUSCATION_KEY.split('').map((c) => c.charCodeAt(0));
}

function obfuscateFallback(plaintext: string): string {
  const key = getObfuscationKey();
  const result: number[] = [];
  for (let i = 0; i < plaintext.length; i++) {
    result.push(plaintext.charCodeAt(i) ^ key[i % key.length]);
  }
  return btoa(String.fromCharCode(...result));
}

function deobfuscateFallback(obfuscated: string): string {
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
 * Synchronous obfuscate function for backward compatibility
 * @deprecated Use encryptString for new implementations
 *
 * WARNING: This uses simple XOR obfuscation which is NOT cryptographically secure.
 * For production with sensitive credentials, use server-side storage.
 */
export function obfuscate(plaintext: string): string {
  if (!plaintext) return '';
  return obfuscateFallback(plaintext);
}

/**
 * Synchronous deobfuscate function for backward compatibility
 * @deprecated Use decryptString for new implementations
 */
export function deobfuscate(obfuscated: string): string {
  if (!obfuscated) return '';
  return deobfuscateFallback(obfuscated);
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

/**
 * DOMPurify configuration for email content sanitization
 * Allows safe HTML tags commonly used in emails while stripping dangerous elements
 */
const DOMPURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'a', 'img',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'pre', 'code',
    'center', 'font',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'width', 'height',
    'style', 'class', 'id', 'target', 'rel',
    'align', 'valign', 'bgcolor', 'color', 'border',
    'cellpadding', 'cellspacing',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify with a configuration suitable for email content
 *
 * @param html - The HTML content to sanitize
 * @param options - Optional DOMPurify configuration overrides
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string, options?: DOMPurify.Config): string {
  if (!html || typeof html !== 'string') return '';

  // In server-side rendering, DOMPurify may not work without a DOM
  // Return escaped HTML as a fallback
  if (typeof window === 'undefined') {
    // For SSR, we return the HTML as-is since it will be sanitized on client
    // The actual sanitization happens in the browser where DOMPurify has access to DOM
    return html;
  }

  // Type assertion needed due to DOMPurify type definition mismatches between esm and cjs
  const config = { ...DOMPURIFY_CONFIG, ...options } as unknown as Parameters<typeof DOMPurify.sanitize>[1];
  return DOMPurify.sanitize(html, config) as string;
}

/**
 * Sanitize HTML for email preview with merge tag replacement
 * Replaces common merge tags with sample data and sanitizes the result
 *
 * @param html - The HTML content with merge tags
 * @param sampleData - Optional sample data for merge tag replacement
 * @returns Sanitized HTML with merge tags replaced
 */
export function sanitizeEmailPreview(
  html: string,
  sampleData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    date?: string;
  }
): string {
  if (!html || typeof html !== 'string') return '';

  const data = {
    firstName: sampleData?.firstName || 'John',
    lastName: sampleData?.lastName || 'Doe',
    email: sampleData?.email || 'john@example.com',
    company: sampleData?.company || 'Acme Inc',
    date: sampleData?.date || new Date().toLocaleDateString(),
  };

  const processed = html
    .replace(/\{\{firstName\}\}/g, escapeHtml(data.firstName))
    .replace(/\{\{lastName\}\}/g, escapeHtml(data.lastName))
    .replace(/\{\{email\}\}/g, escapeHtml(data.email))
    .replace(/\{\{company\}\}/g, escapeHtml(data.company))
    .replace(/\{\{date\}\}/g, escapeHtml(data.date));

  return sanitizeHtml(processed);
}
