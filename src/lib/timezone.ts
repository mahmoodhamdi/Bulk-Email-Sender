/**
 * Timezone utilities with proper DST handling
 *
 * Key principles:
 * 1. Always store dates in UTC (ISO 8601 format)
 * 2. Convert to local timezone only for display
 * 3. Use IANA timezone identifiers (e.g., 'America/New_York')
 * 4. Let the browser's Intl API handle DST transitions
 */

export interface TimezoneInfo {
  id: string;
  label: string;
  region: string;
}

/**
 * Common timezones organized by region
 * Using IANA timezone identifiers for proper DST handling
 */
export const TIMEZONES: TimezoneInfo[] = [
  // Universal
  { id: 'UTC', label: 'UTC', region: 'Universal' },

  // Americas
  { id: 'America/New_York', label: 'Eastern Time', region: 'Americas' },
  { id: 'America/Chicago', label: 'Central Time', region: 'Americas' },
  { id: 'America/Denver', label: 'Mountain Time', region: 'Americas' },
  { id: 'America/Los_Angeles', label: 'Pacific Time', region: 'Americas' },
  { id: 'America/Anchorage', label: 'Alaska Time', region: 'Americas' },
  { id: 'Pacific/Honolulu', label: 'Hawaii Time', region: 'Americas' },
  { id: 'America/Sao_Paulo', label: 'Brasilia Time', region: 'Americas' },
  { id: 'America/Toronto', label: 'Toronto', region: 'Americas' },
  { id: 'America/Mexico_City', label: 'Mexico City', region: 'Americas' },

  // Europe
  { id: 'Europe/London', label: 'London', region: 'Europe' },
  { id: 'Europe/Paris', label: 'Paris', region: 'Europe' },
  { id: 'Europe/Berlin', label: 'Berlin', region: 'Europe' },
  { id: 'Europe/Moscow', label: 'Moscow', region: 'Europe' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam', region: 'Europe' },
  { id: 'Europe/Rome', label: 'Rome', region: 'Europe' },

  // Asia
  { id: 'Asia/Dubai', label: 'Dubai', region: 'Asia' },
  { id: 'Asia/Kolkata', label: 'India', region: 'Asia' },
  { id: 'Asia/Singapore', label: 'Singapore', region: 'Asia' },
  { id: 'Asia/Shanghai', label: 'China', region: 'Asia' },
  { id: 'Asia/Tokyo', label: 'Tokyo', region: 'Asia' },
  { id: 'Asia/Seoul', label: 'Seoul', region: 'Asia' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong', region: 'Asia' },

  // Oceania
  { id: 'Australia/Sydney', label: 'Sydney', region: 'Oceania' },
  { id: 'Australia/Perth', label: 'Perth', region: 'Oceania' },
  { id: 'Australia/Melbourne', label: 'Melbourne', region: 'Oceania' },
  { id: 'Pacific/Auckland', label: 'Auckland', region: 'Oceania' },

  // Africa
  { id: 'Africa/Cairo', label: 'Cairo', region: 'Africa' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg', region: 'Africa' },
  { id: 'Africa/Lagos', label: 'Lagos', region: 'Africa' },
];

/**
 * Get the user's local timezone using the browser's Intl API
 */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Get the current UTC offset for a timezone (accounting for DST)
 * Returns offset in minutes (e.g., -300 for EST, -240 for EDT)
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  try {
    // Get the date string in the target timezone
    const tzDateStr = date.toLocaleString('en-US', { timeZone: timezone });
    const utcDateStr = date.toLocaleString('en-US', { timeZone: 'UTC' });

    const tzDate = new Date(tzDateStr);
    const utcDate = new Date(utcDateStr);

    // Offset in minutes
    return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
  } catch {
    return 0;
  }
}

/**
 * Format timezone offset as string (e.g., "+05:30", "-08:00")
 * This calculates the CURRENT offset, accounting for DST
 */
export function formatTimezoneOffset(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });

    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');

    if (offsetPart) {
      // Extract offset from "GMT+05:30" format
      const match = offsetPart.value.match(/GMT([+-]\d{2}:\d{2})/);
      if (match) return match[1];

      // Handle "GMT" (UTC)
      if (offsetPart.value === 'GMT') return '+00:00';
    }

    return '+00:00';
  } catch {
    return '+00:00';
  }
}

/**
 * Format timezone for display with current offset
 */
export function formatTimezoneDisplay(timezoneId: string): string {
  const tz = TIMEZONES.find((t) => t.id === timezoneId);
  const offset = formatTimezoneOffset(timezoneId);

  if (tz) {
    return `${tz.label} (${offset})`;
  }

  return `${timezoneId} (${offset})`;
}

/**
 * Create a Date object from date and time in a specific timezone
 * This properly handles DST transitions
 *
 * @param year - Full year (e.g., 2024)
 * @param month - Month (1-12)
 * @param day - Day of month (1-31)
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @param timezone - IANA timezone identifier
 * @returns Date object in UTC
 */
export function createDateInTimezone(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timezone: string
): Date {
  // Create a date string in ISO format without timezone
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Use the browser's timezone parsing
  // First, create a date assuming local timezone
  const localDate = new Date(dateStr);

  // Get the offset for the target timezone at this date
  const targetOffset = getTimezoneOffset(timezone, localDate);
  const localOffset = localDate.getTimezoneOffset();

  // Adjust for the difference
  const adjustedTime = localDate.getTime() + (localOffset - targetOffset) * 60 * 1000;

  return new Date(adjustedTime);
}

/**
 * Convert a date from one timezone's local time to UTC
 * The input date is treated as if it's in the specified timezone
 */
export function localToUTC(date: Date, timezone: string): Date {
  return createDateInTimezone(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    timezone
  );
}

/**
 * Parse a time string (HH:MM) and date, converting to UTC
 */
export function parseTimeInTimezone(
  date: Date,
  timeString: string,
  timezone: string
): Date {
  const [hours, minutes] = timeString.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid time string format');
  }

  return createDateInTimezone(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    hours,
    minutes,
    timezone
  );
}

/**
 * Format a UTC date for display in a specific timezone
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  };

  try {
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Get components of a date in a specific timezone
 */
export function getDatePartsInTimezone(
  date: Date,
  timezone: string
): { year: number; month: number; day: number; hours: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hours: getPart('hour'),
    minutes: getPart('minute'),
  };
}

/**
 * Check if a date falls within DST for a timezone
 */
export function isDST(date: Date, timezone: string): boolean {
  // Compare January and July offsets to determine if DST is in effect
  const january = new Date(date.getFullYear(), 0, 1);
  const july = new Date(date.getFullYear(), 6, 1);

  const januaryOffset = getTimezoneOffset(timezone, january);
  const julyOffset = getTimezoneOffset(timezone, july);
  const currentOffset = getTimezoneOffset(timezone, date);

  // DST is when current offset differs from the "standard" time
  // In Northern hemisphere, standard is winter (January)
  // In Southern hemisphere, standard is summer (January)
  const standardOffset = Math.max(januaryOffset, julyOffset);
  return currentOffset !== standardOffset;
}

/**
 * Get time remaining until a scheduled date
 */
export function getTimeUntil(
  scheduledAt: Date
): { days: number; hours: number; minutes: number } | null {
  const now = new Date();
  const diff = scheduledAt.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

/**
 * Validate that a timezone ID is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
