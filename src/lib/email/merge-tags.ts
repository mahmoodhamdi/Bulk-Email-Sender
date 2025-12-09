const VALID_MERGE_TAGS = [
  'firstName',
  'lastName',
  'email',
  'company',
  'customField1',
  'customField2',
  'unsubscribeLink',
  'date',
  'trackingPixel',
] as const;

export type MergeTagName = (typeof VALID_MERGE_TAGS)[number];

export interface MergeTagData {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  customField1?: string;
  customField2?: string;
  unsubscribeLink?: string;
  date?: string;
  trackingPixel?: string;
  [key: string]: string | undefined;
}

export interface ValidationResult {
  valid: boolean;
  invalidTags: string[];
}

/**
 * Replace merge tags in content with actual values
 */
export function replaceMergeTags(content: string, data: MergeTagData): string {
  let result = content;

  // Add current date if not provided
  if (!data.date) {
    data.date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Replace all merge tags (case-insensitive)
  const tagPattern = /\{\{(\w+)\}\}/gi;

  result = result.replace(tagPattern, (match, tagName: string) => {
    // Normalize tag name to find matching key
    const normalizedTagName = tagName.toLowerCase();

    // Find matching key in data (case-insensitive)
    const matchingKey = Object.keys(data).find(
      (key) => key.toLowerCase() === normalizedTagName
    );

    if (matchingKey && data[matchingKey] !== undefined) {
      return data[matchingKey] as string;
    }

    // Return empty string for missing tags
    return '';
  });

  return result;
}

/**
 * Extract all merge tags from content
 */
export function extractMergeTags(content: string): string[] {
  const tagPattern = /\{\{(\w+)\}\}/g;
  const tags: string[] = [];
  let match;

  while ((match = tagPattern.exec(content)) !== null) {
    const tagName = match[1];
    if (!tags.includes(tagName)) {
      tags.push(tagName);
    }
  }

  return tags;
}

/**
 * Validate that all tags are valid merge tags
 */
export function validateMergeTags(tags: string[]): ValidationResult {
  const validTagsLower = VALID_MERGE_TAGS.map((t) => t.toLowerCase());
  const invalidTags: string[] = [];

  for (const tag of tags) {
    if (!validTagsLower.includes(tag.toLowerCase())) {
      invalidTags.push(tag);
    }
  }

  return {
    valid: invalidTags.length === 0,
    invalidTags,
  };
}

/**
 * Get all available merge tags
 */
export function getAvailableMergeTags(): readonly string[] {
  return VALID_MERGE_TAGS;
}

/**
 * Generate unsubscribe link HTML
 */
export function generateUnsubscribeLink(token: string, baseUrl: string): string {
  const url = `${baseUrl}/api/unsubscribe/${token}`;
  return `<a href="${url}" style="color: #666; text-decoration: underline;">unsubscribe</a>`;
}

/**
 * Generate tracking pixel HTML
 */
export function generateTrackingPixel(trackingId: string, baseUrl: string): string {
  const url = `${baseUrl}/api/track/open/${trackingId}`;
  return `<img src="${url}" width="1" height="1" alt="" style="display:none" />`;
}

/**
 * Wrap links for click tracking
 */
export function wrapLinksForTracking(
  content: string,
  trackingId: string,
  baseUrl: string
): string {
  const linkPattern = /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi;

  return content.replace(linkPattern, (match, prefix, url, suffix) => {
    // Don't wrap unsubscribe links or already tracked links
    if (url.includes('/unsubscribe/') || url.includes('/track/')) {
      return match;
    }

    const encodedUrl = encodeURIComponent(url);
    const trackingUrl = `${baseUrl}/api/track/click/${trackingId}?url=${encodedUrl}`;
    return `<a ${prefix}${trackingUrl}${suffix}>`;
  });
}
