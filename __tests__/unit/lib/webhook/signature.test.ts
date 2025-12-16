import { describe, it, expect } from 'vitest';
import {
  generateHmacSignature,
  generateSignatureHeader,
  verifyHmacSignature,
  generateWebhookSecret,
  buildAuthHeaders,
} from '@/lib/webhook/signature';

describe('Webhook Signature', () => {
  describe('generateHmacSignature', () => {
    it('should generate consistent HMAC signature', () => {
      const payload = '{"event":"email.sent"}';
      const secret = 'test-secret';

      const signature1 = generateHmacSignature(payload, secret);
      const signature2 = generateHmacSignature(payload, secret);

      expect(signature1).toBe(signature2);
      expect(signature1).toHaveLength(64); // SHA-256 hex output
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test-secret';

      const signature1 = generateHmacSignature('{"event":"email.sent"}', secret);
      const signature2 = generateHmacSignature('{"event":"email.opened"}', secret);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = '{"event":"email.sent"}';

      const signature1 = generateHmacSignature(payload, 'secret-1');
      const signature2 = generateHmacSignature(payload, 'secret-2');

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('generateSignatureHeader', () => {
    it('should generate header with sha256 prefix', () => {
      const payload = '{"event":"email.sent"}';
      const secret = 'test-secret';
      const timestamp = '1234567890';

      const header = generateSignatureHeader(payload, secret, timestamp);

      expect(header).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should include timestamp in signature calculation', () => {
      const payload = '{"event":"email.sent"}';
      const secret = 'test-secret';

      const header1 = generateSignatureHeader(payload, secret, '1000');
      const header2 = generateSignatureHeader(payload, secret, '2000');

      expect(header1).not.toBe(header2);
    });
  });

  describe('verifyHmacSignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"event":"email.sent"}';
      const secret = 'test-secret';

      const signature = generateHmacSignature(payload, secret);
      const isValid = verifyHmacSignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"event":"email.sent"}';
      const secret = 'test-secret';

      const isValid = verifyHmacSignature(payload, 'invalid-signature', secret);

      expect(isValid).toBe(false);
    });

    it('should reject signature from wrong secret', () => {
      const payload = '{"event":"email.sent"}';

      const signature = generateHmacSignature(payload, 'wrong-secret');
      const isValid = verifyHmacSignature(payload, signature, 'correct-secret');

      expect(isValid).toBe(false);
    });

    it('should reject signature from modified payload', () => {
      const secret = 'test-secret';

      const signature = generateHmacSignature('original-payload', secret);
      const isValid = verifyHmacSignature('modified-payload', signature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe('generateWebhookSecret', () => {
    it('should generate secret with whsec_ prefix', () => {
      const secret = generateWebhookSecret();
      expect(secret).toMatch(/^whsec_/);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();

      expect(secret1).not.toBe(secret2);
    });

    it('should generate sufficiently long secrets', () => {
      const secret = generateWebhookSecret();
      // whsec_ prefix (6 chars) + 32 base64url chars (24 bytes)
      expect(secret.length).toBeGreaterThan(30);
    });
  });

  describe('buildAuthHeaders', () => {
    it('should return empty headers for NONE auth type', () => {
      const headers = buildAuthHeaders('NONE', {});
      expect(headers).toEqual({});
    });

    it('should build Basic auth header', () => {
      const headers = buildAuthHeaders('BASIC', {
        authValue: 'username:password',
      });

      expect(headers['Authorization']).toMatch(/^Basic /);
      // Verify base64 encoding
      const encoded = headers['Authorization'].replace('Basic ', '');
      const decoded = Buffer.from(encoded, 'base64').toString();
      expect(decoded).toBe('username:password');
    });

    it('should build Bearer auth header', () => {
      const headers = buildAuthHeaders('BEARER', {
        authValue: 'my-token-123',
      });

      expect(headers['Authorization']).toBe('Bearer my-token-123');
    });

    it('should build API_KEY header with custom header name', () => {
      const headers = buildAuthHeaders('API_KEY', {
        authHeader: 'X-Custom-API-Key',
        authValue: 'api-key-value',
      });

      expect(headers['X-Custom-API-Key']).toBe('api-key-value');
    });

    it('should build HMAC signature headers', () => {
      const headers = buildAuthHeaders('HMAC', {
        secret: 'test-secret',
        payload: '{"event":"test"}',
        timestamp: '1234567890',
      });

      expect(headers['X-Webhook-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(headers['X-Webhook-Timestamp']).toBe('1234567890');
    });

    it('should generate timestamp for HMAC if not provided', () => {
      const headers = buildAuthHeaders('HMAC', {
        secret: 'test-secret',
        payload: '{"event":"test"}',
      });

      expect(headers['X-Webhook-Signature']).toBeDefined();
      expect(headers['X-Webhook-Timestamp']).toBeDefined();
    });

    it('should return empty headers if required values are missing', () => {
      // BASIC without authValue
      expect(buildAuthHeaders('BASIC', {})).toEqual({});

      // BEARER without authValue
      expect(buildAuthHeaders('BEARER', {})).toEqual({});

      // API_KEY without authHeader or authValue
      expect(buildAuthHeaders('API_KEY', { authValue: 'key' })).toEqual({});
      expect(buildAuthHeaders('API_KEY', { authHeader: 'X-Key' })).toEqual({});

      // HMAC without secret or payload
      expect(buildAuthHeaders('HMAC', {})).toEqual({});
      expect(buildAuthHeaders('HMAC', { secret: 'secret' })).toEqual({});
    });
  });
});
