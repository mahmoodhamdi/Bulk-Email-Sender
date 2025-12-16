import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateHmacSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Generate webhook signature header value
 */
export function generateSignatureHeader(payload: string, secret: string, timestamp: string): string {
  const signature = generateHmacSignature(`${timestamp}.${payload}`, secret);
  return `sha256=${signature}`;
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateHmacSignature(payload, secret);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('base64url')}`;
}

/**
 * Build authentication headers based on auth type
 */
export function buildAuthHeaders(
  authType: 'NONE' | 'BASIC' | 'BEARER' | 'API_KEY' | 'HMAC',
  options: {
    authHeader?: string;
    authValue?: string;
    secret?: string;
    payload?: string;
    timestamp?: string;
  }
): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (authType) {
    case 'BASIC':
      if (options.authValue) {
        // authValue should be "username:password"
        const encoded = Buffer.from(options.authValue).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;

    case 'BEARER':
      if (options.authValue) {
        headers['Authorization'] = `Bearer ${options.authValue}`;
      }
      break;

    case 'API_KEY':
      if (options.authHeader && options.authValue) {
        headers[options.authHeader] = options.authValue;
      }
      break;

    case 'HMAC':
      if (options.secret && options.payload) {
        const timestamp = options.timestamp || Date.now().toString();
        headers['X-Webhook-Signature'] = generateSignatureHeader(
          options.payload,
          options.secret,
          timestamp
        );
        headers['X-Webhook-Timestamp'] = timestamp;
      }
      break;

    case 'NONE':
    default:
      break;
  }

  return headers;
}
