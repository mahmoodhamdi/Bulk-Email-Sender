import { describe, it, expect } from 'vitest';
import { isUrlSafeSync } from '@/lib/ssrf-protection';

describe('SSRF Protection', () => {
  describe('isUrlSafeSync', () => {
    it('should allow valid HTTPS URLs', () => {
      expect(isUrlSafeSync('https://example.com/webhook')).toBe(true);
      expect(isUrlSafeSync('https://api.example.com/v1/webhook')).toBe(true);
    });

    it('should allow valid HTTP URLs', () => {
      expect(isUrlSafeSync('http://example.com/webhook')).toBe(true);
    });

    it('should block non-HTTP protocols', () => {
      expect(isUrlSafeSync('ftp://example.com/file')).toBe(false);
      expect(isUrlSafeSync('file:///etc/passwd')).toBe(false);
      expect(isUrlSafeSync('javascript:alert(1)')).toBe(false);
      expect(isUrlSafeSync('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should block localhost', () => {
      expect(isUrlSafeSync('http://localhost/webhook')).toBe(false);
      expect(isUrlSafeSync('http://localhost:8080/webhook')).toBe(false);
      expect(isUrlSafeSync('https://localhost/webhook')).toBe(false);
    });

    it('should block 127.0.0.1', () => {
      expect(isUrlSafeSync('http://127.0.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://127.0.0.1:3000/webhook')).toBe(false);
      expect(isUrlSafeSync('http://127.0.0.255/webhook')).toBe(false);
    });

    it('should block private IP ranges (10.x.x.x)', () => {
      expect(isUrlSafeSync('http://10.0.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://10.255.255.255/webhook')).toBe(false);
    });

    it('should block private IP ranges (172.16-31.x.x)', () => {
      expect(isUrlSafeSync('http://172.16.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://172.31.255.255/webhook')).toBe(false);
      // 172.15 should be allowed (not in private range)
      expect(isUrlSafeSync('http://172.15.0.1/webhook')).toBe(true);
      // 172.32 should be allowed (not in private range)
      expect(isUrlSafeSync('http://172.32.0.1/webhook')).toBe(true);
    });

    it('should block private IP ranges (192.168.x.x)', () => {
      expect(isUrlSafeSync('http://192.168.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://192.168.1.100/webhook')).toBe(false);
    });

    it('should block link-local addresses (169.254.x.x)', () => {
      expect(isUrlSafeSync('http://169.254.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://169.254.169.254/webhook')).toBe(false); // AWS metadata
    });

    it('should block 0.0.0.0', () => {
      expect(isUrlSafeSync('http://0.0.0.0/webhook')).toBe(false);
    });

    it('should block metadata service endpoints', () => {
      expect(isUrlSafeSync('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(isUrlSafeSync('http://metadata.google.internal/computeMetadata/')).toBe(false);
    });

    it('should block internal hostnames', () => {
      expect(isUrlSafeSync('http://internal/webhook')).toBe(false);
      expect(isUrlSafeSync('http://intranet/webhook')).toBe(false);
      expect(isUrlSafeSync('http://corp/webhook')).toBe(false);
      expect(isUrlSafeSync('http://local/webhook')).toBe(false);
    });

    it('should block subdomains of blocked hostnames', () => {
      expect(isUrlSafeSync('http://api.localhost/webhook')).toBe(false);
      expect(isUrlSafeSync('http://app.internal/webhook')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isUrlSafeSync('not-a-url')).toBe(false);
      expect(isUrlSafeSync('')).toBe(false);
    });

    it('should block IPv6 loopback', () => {
      expect(isUrlSafeSync('http://[::1]/webhook')).toBe(false);
    });

    it('should block IPv6 link-local', () => {
      expect(isUrlSafeSync('http://[fe80::1]/webhook')).toBe(false);
    });

    it('should block IPv6 unique local', () => {
      expect(isUrlSafeSync('http://[fc00::1]/webhook')).toBe(false);
      expect(isUrlSafeSync('http://[fd00::1]/webhook')).toBe(false);
    });

    it('should block shared address space (100.64.x.x)', () => {
      expect(isUrlSafeSync('http://100.64.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://100.127.255.255/webhook')).toBe(false);
      // 100.63 and 100.128 should be allowed
      expect(isUrlSafeSync('http://100.63.255.255/webhook')).toBe(true);
      expect(isUrlSafeSync('http://100.128.0.1/webhook')).toBe(true);
    });

    it('should block test networks', () => {
      expect(isUrlSafeSync('http://192.0.2.1/webhook')).toBe(false); // TEST-NET-1
      expect(isUrlSafeSync('http://198.51.100.1/webhook')).toBe(false); // TEST-NET-2
      expect(isUrlSafeSync('http://203.0.113.1/webhook')).toBe(false); // TEST-NET-3
    });

    it('should block multicast addresses', () => {
      expect(isUrlSafeSync('http://224.0.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://239.255.255.255/webhook')).toBe(false);
    });

    it('should block reserved addresses', () => {
      expect(isUrlSafeSync('http://240.0.0.1/webhook')).toBe(false);
      expect(isUrlSafeSync('http://255.255.255.255/webhook')).toBe(false);
    });
  });
});
