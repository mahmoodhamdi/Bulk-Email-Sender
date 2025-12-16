/**
 * Server-side HTML sanitization using jsdom + DOMPurify
 * This module should ONLY be imported from server-side code (API routes, server components)
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

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

// Create a single jsdom window for DOMPurify
const dom = new JSDOM('');
const purify = DOMPurify(dom.window);

/**
 * Sanitize HTML content to prevent XSS attacks (server-side only)
 * Uses DOMPurify with jsdom for DOM access
 *
 * @param html - The HTML content to sanitize
 * @param options - Optional DOMPurify configuration overrides
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtmlServer(html: string, options?: DOMPurify.Config): string {
  if (!html || typeof html !== 'string') return '';

  // Type assertion needed due to DOMPurify type definition mismatches
  const config = { ...DOMPURIFY_CONFIG, ...options } as unknown as Parameters<typeof purify.sanitize>[1];
  return purify.sanitize(html, config) as string;
}

/**
 * Sanitize HTML for email with merge tag preservation
 * Preserves {{mergeTags}} while sanitizing everything else
 *
 * @param html - The HTML content with merge tags
 * @returns Sanitized HTML with merge tags intact
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Merge tags are safe - they're replaced server-side before sending
  // DOMPurify might encode the braces, so we need to preserve them
  const mergeTagPlaceholders: Map<string, string> = new Map();
  let placeholderIndex = 0;

  // Replace merge tags with placeholders
  const htmlWithPlaceholders = html.replace(/\{\{[^}]+\}\}/g, (match) => {
    const placeholder = `__MERGE_TAG_${placeholderIndex++}__`;
    mergeTagPlaceholders.set(placeholder, match);
    return placeholder;
  });

  // Sanitize the HTML
  const sanitized = sanitizeHtmlServer(htmlWithPlaceholders);

  // Restore merge tags
  let result = sanitized;
  mergeTagPlaceholders.forEach((originalTag, placeholder) => {
    result = result.replace(placeholder, originalTag);
  });

  return result;
}
