/**
 * RFC 5321 compliant email validation regex pattern
 * - Validates total length (max 254 chars)
 * - Validates local part length (max 64 chars)
 * - Supports standard email formats including subdomains and plus addressing
 * - Requires at least 2-char TLD
 */
const EMAIL_REGEX =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export interface ValidationResult {
  valid: string[];
  invalid: string[];
  validCount: number;
  invalidCount: number;
}

export interface DeduplicationResult {
  unique: string[];
  duplicatesRemoved: number;
}

/**
 * Validate a single email address
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return false;
  }

  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validate multiple email addresses
 * Returns both valid and invalid emails with counts
 */
export function validateEmails(emails: string[]): ValidationResult {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    const trimmed = email.trim();
    if (validateEmail(trimmed)) {
      valid.push(trimmed);
    } else if (trimmed.length > 0) {
      invalid.push(trimmed);
    }
  }

  return {
    valid,
    invalid,
    validCount: valid.length,
    invalidCount: invalid.length,
  };
}

/**
 * Find duplicate emails in a list (case-insensitive)
 * Returns array of emails that appear more than once
 */
export function findDuplicates(emails: string[]): string[] {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  for (const email of emails) {
    const normalized = email.toLowerCase().trim();
    const count = seen.get(normalized) || 0;
    seen.set(normalized, count + 1);
  }

  for (const [email, count] of seen.entries()) {
    if (count > 1) {
      duplicates.push(email);
    }
  }

  return duplicates;
}

/**
 * Remove duplicate emails (case-insensitive)
 * Keeps the first occurrence of each email
 */
export function removeDuplicates(emails: string[]): DeduplicationResult {
  const seen = new Set<string>();
  const unique: string[] = [];
  let duplicatesRemoved = 0;

  for (const email of emails) {
    const normalized = email.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(email.trim());
    } else {
      duplicatesRemoved++;
    }
  }

  return {
    unique,
    duplicatesRemoved,
  };
}

/**
 * Parse emails from text (one per line or comma-separated)
 */
export function parseEmailList(text: string): string[] {
  const emails: string[] = [];

  // Split by newlines first, then by commas
  const lines = text.split(/[\n\r]+/);

  for (const line of lines) {
    const parts = line.split(',');
    for (const part of parts) {
      const email = part.trim();
      if (email.length > 0) {
        emails.push(email);
      }
    }
  }

  return emails;
}

/**
 * Normalize an email address (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if an email domain is valid (has MX record - simplified check)
 * This is a basic check, actual MX lookup would require DNS resolution
 */
export function isValidDomain(email: string): boolean {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const domain = parts[1];
  // Basic domain format check
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}
