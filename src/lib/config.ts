/**
 * Application configuration from environment variables
 * Provides type-safe access to configuration values with sensible defaults
 */

export interface AppConfig {
  // Contact information
  contact: {
    email: string;
    supportEmail: string;
    phone: string;
  };

  // App URLs
  urls: {
    app: string;
    tracking: string;
  };

  // Feature flags
  features: {
    trackOpens: boolean;
    trackClicks: boolean;
  };
}

/**
 * Get application configuration
 * Values come from environment variables with fallbacks
 */
export function getConfig(): AppConfig {
  return {
    contact: {
      email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
      supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
      phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
    },
    urls: {
      app: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      tracking: process.env.TRACKING_URL || 'http://localhost:3000/api/track',
    },
    features: {
      trackOpens: process.env.NEXT_PUBLIC_TRACK_OPENS !== 'false',
      trackClicks: process.env.NEXT_PUBLIC_TRACK_CLICKS !== 'false',
    },
  };
}

/**
 * Get contact display string for footer/UI
 * Returns formatted contact info or empty string if not configured
 */
export function getContactDisplay(): string {
  const config = getConfig();
  const parts: string[] = [];

  if (config.contact.email) {
    parts.push(config.contact.email);
  }

  if (config.contact.phone) {
    parts.push(config.contact.phone);
  }

  return parts.join(' | ');
}

/**
 * Check if contact information is configured
 */
export function hasContactInfo(): boolean {
  const config = getConfig();
  return !!(config.contact.email || config.contact.phone);
}
