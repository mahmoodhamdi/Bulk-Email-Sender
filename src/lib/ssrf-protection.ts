/**
 * SSRF (Server-Side Request Forgery) Protection
 * Validates URLs and blocks requests to internal/private networks
 */

import { lookup } from 'dns/promises';

/**
 * SSRF validation result
 */
export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  resolvedIp?: string;
}

/**
 * Private IP ranges that should be blocked
 */
const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  /^127\./, // Loopback (127.0.0.0/8)
  /^10\./, // Class A private (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private (172.16.0.0/12)
  /^192\.168\./, // Class C private (192.168.0.0/16)
  /^169\.254\./, // Link-local (169.254.0.0/16)
  /^0\./, // Current network (0.0.0.0/8)
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Shared address space (100.64.0.0/10)
  /^192\.0\.0\./, // IETF Protocol Assignments (192.0.0.0/24)
  /^192\.0\.2\./, // TEST-NET-1 (192.0.2.0/24)
  /^198\.51\.100\./, // TEST-NET-2 (198.51.100.0/24)
  /^203\.0\.113\./, // TEST-NET-3 (203.0.113.0/24)
  /^198\.18\./, // Network benchmark tests (198.18.0.0/15)
  /^22[4-9]\./, // Multicast (224.0.0.0/4) - 224-229
  /^23[0-9]\./, // Multicast (224.0.0.0/4) - 230-239
  /^24[0-9]\./, // Reserved for future use (240.0.0.0/4) - 240-249
  /^25[0-5]\./, // Reserved for future use (240.0.0.0/4) - 250-255
  /^255\.255\.255\.255$/, // Limited broadcast
  // IPv6 private/special ranges (simplified patterns)
  /^::1$/, // Loopback
  /^fe80:/i, // Link-local
  /^fc00:/i, // Unique local
  /^fd/i, // Unique local
  /^ff/i, // Multicast
];

/**
 * Blocked hostnames
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  // AWS metadata service
  '169.254.169.254',
  'metadata.google.internal',
  // Common internal hostnames
  'internal',
  'intranet',
  'corp',
  'local',
];

/**
 * Allowed protocols
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Check if an IP address is private/internal
 */
function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(ip));
}

/**
 * Check if a hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();

  // Check exact match
  if (BLOCKED_HOSTNAMES.includes(normalizedHostname)) {
    return true;
  }

  // Check if it ends with a blocked hostname
  for (const blocked of BLOCKED_HOSTNAMES) {
    if (normalizedHostname.endsWith(`.${blocked}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a URL for SSRF vulnerabilities
 * Returns whether the URL is safe to request
 *
 * @param url - The URL to validate
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateUrlForSsrf(
  url: string,
  options: {
    allowPrivateIps?: boolean;
    resolveDns?: boolean;
  } = {}
): Promise<SsrfValidationResult> {
  const { allowPrivateIps = false, resolveDns = true } = options;

  try {
    // Parse the URL
    const parsedUrl = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return {
        safe: false,
        reason: `Protocol '${parsedUrl.protocol}' is not allowed. Only HTTP and HTTPS are permitted.`,
      };
    }

    const hostname = parsedUrl.hostname;

    // Check if hostname is blocked
    if (isBlockedHostname(hostname)) {
      return {
        safe: false,
        reason: `Hostname '${hostname}' is blocked. Internal hostnames are not allowed.`,
      };
    }

    // Check if hostname is an IP address
    const ipv4Match = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    const ipv6Match = hostname.startsWith('[') && hostname.endsWith(']');

    if (ipv4Match || ipv6Match) {
      const ip = ipv6Match ? hostname.slice(1, -1) : hostname;

      if (!allowPrivateIps && isPrivateIp(ip)) {
        return {
          safe: false,
          reason: `IP address '${ip}' is a private/internal address.`,
          resolvedIp: ip,
        };
      }

      return {
        safe: true,
        resolvedIp: ip,
      };
    }

    // Resolve DNS to check if it points to a private IP
    if (resolveDns) {
      try {
        const addresses = await lookup(hostname, { all: true });

        for (const addr of addresses) {
          if (!allowPrivateIps && isPrivateIp(addr.address)) {
            return {
              safe: false,
              reason: `Hostname '${hostname}' resolves to private IP '${addr.address}'.`,
              resolvedIp: addr.address,
            };
          }
        }

        // Return the first resolved IP
        const primaryIp = addresses[0]?.address;
        return {
          safe: true,
          resolvedIp: primaryIp,
        };
      } catch (dnsError) {
        // DNS resolution failed - could be a non-existent domain
        // We allow it through since it will fail at the actual request
        return {
          safe: true,
          reason: `DNS resolution failed for '${hostname}', proceeding anyway.`,
        };
      }
    }

    // No DNS resolution requested, assume safe
    return {
      safe: true,
    };
  } catch (error) {
    // Invalid URL
    return {
      safe: false,
      reason: error instanceof Error ? error.message : 'Invalid URL',
    };
  }
}

/**
 * Validate a webhook URL for SSRF vulnerabilities
 * This is a convenience wrapper with stricter defaults for webhooks
 */
export async function validateWebhookUrl(url: string): Promise<SsrfValidationResult> {
  return validateUrlForSsrf(url, {
    allowPrivateIps: false,
    resolveDns: true,
  });
}

/**
 * Synchronous URL validation (without DNS resolution)
 * Useful for quick validation in sync code
 */
export function isUrlSafeSync(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }

    const hostname = parsedUrl.hostname;

    // Check if hostname is blocked
    if (isBlockedHostname(hostname)) {
      return false;
    }

    // Check if hostname is a private IP address
    const ipv4Match = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    const ipv6Match = hostname.startsWith('[') && hostname.endsWith(']');

    if (ipv4Match || ipv6Match) {
      const ip = ipv6Match ? hostname.slice(1, -1) : hostname;
      return !isPrivateIp(ip);
    }

    return true;
  } catch {
    return false;
  }
}
