import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCsrf, getCsrfFetchOptions } from '@/hooks/useCsrf';

// Mock fetch
global.fetch = vi.fn();

// Store original document.cookie descriptor
const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');

describe('useCsrf', () => {
  let cookieValue = '';

  beforeEach(() => {
    vi.clearAllMocks();
    cookieValue = '';
    // Mock document.cookie with getter/setter
    Object.defineProperty(document, 'cookie', {
      get: () => cookieValue,
      set: (value: string) => { cookieValue = value; },
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original
    if (originalCookieDescriptor) {
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    }
  });

  describe('token', () => {
    it('should return null when no CSRF cookie exists', () => {
      const { result } = renderHook(() => useCsrf());
      expect(result.current.token).toBeNull();
    });

    it('should return token when CSRF cookie exists', () => {
      cookieValue = 'csrf-token=test-token-123';
      const { result } = renderHook(() => useCsrf());
      expect(result.current.token).toBe('test-token-123');
    });
  });

  describe('getHeaders', () => {
    it('should return headers with Content-Type', () => {
      const { result } = renderHook(() => useCsrf());
      const headers = result.current.getHeaders();
      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should return headers object', () => {
      const { result } = renderHook(() => useCsrf());
      const headers = result.current.getHeaders() as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should merge with additional headers object', () => {
      const { result } = renderHook(() => useCsrf());
      const headers = result.current.getHeaders({
        'Authorization': 'Bearer xyz',
        'X-Custom': 'value',
      }) as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer xyz');
      expect(headers['X-Custom']).toBe('value');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should merge with Headers instance', () => {
      const { result } = renderHook(() => useCsrf());
      const additionalHeaders = new Headers();
      additionalHeaders.set('Authorization', 'Bearer abc');
      const headers = result.current.getHeaders(additionalHeaders) as Record<string, string>;
      // Headers API lowercases keys when iterating
      expect(headers['authorization']).toBe('Bearer abc');
    });

    it('should merge with array of header tuples', () => {
      const { result } = renderHook(() => useCsrf());
      const headers = result.current.getHeaders([
        ['Authorization', 'Bearer def'],
        ['X-Test', 'test'],
      ]) as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer def');
      expect(headers['X-Test']).toBe('test');
    });
  });

  describe('csrfFetch', () => {
    it('should call fetch with CSRF header', async () => {
      cookieValue = 'csrf-token=fetch-token';
      vi.mocked(fetch).mockResolvedValueOnce(new Response('OK'));

      const { result } = renderHook(() => useCsrf());
      await result.current.csrfFetch('/api/test');

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('x-csrf-token')).toBe('fetch-token');
    });

    it('should set Content-Type if not provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('OK'));

      const { result } = renderHook(() => useCsrf());
      await result.current.csrfFetch('/api/test');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should not override existing Content-Type', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('OK'));

      const { result } = renderHook(() => useCsrf());
      await result.current.csrfFetch('/api/test', {
        headers: { 'Content-Type': 'text/plain' },
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Content-Type')).toBe('text/plain');
    });

    it('should pass through other options', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('OK'));

      const { result } = renderHook(() => useCsrf());
      await result.current.csrfFetch('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });

    it('should work without CSRF token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('OK'));

      const { result } = renderHook(() => useCsrf());
      await result.current.csrfFetch('/api/test');

      expect(fetch).toHaveBeenCalled();
    });
  });
});

describe('getCsrfFetchOptions', () => {
  let cookieValue = '';

  beforeEach(() => {
    cookieValue = '';
    Object.defineProperty(document, 'cookie', {
      get: () => cookieValue,
      set: (value: string) => { cookieValue = value; },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalCookieDescriptor) {
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    }
  });

  it('should return options with Content-Type header', () => {
    const options = getCsrfFetchOptions();
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('should include CSRF token in headers when available', () => {
    cookieValue = 'csrf-token=standalone-token';
    const options = getCsrfFetchOptions();
    const headers = options.headers as Headers;
    expect(headers.get('x-csrf-token')).toBe('standalone-token');
  });

  it('should merge with existing options', () => {
    cookieValue = 'csrf-token=token';
    const options = getCsrfFetchOptions({
      method: 'POST',
      body: 'test',
    });
    expect(options.method).toBe('POST');
    expect(options.body).toBe('test');
  });

  it('should preserve existing headers', () => {
    cookieValue = 'csrf-token=token';
    const options = getCsrfFetchOptions({
      headers: { 'Authorization': 'Bearer xyz' },
    });
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer xyz');
    expect(headers.get('x-csrf-token')).toBe('token');
  });

  it('should not override Content-Type if already set', () => {
    const options = getCsrfFetchOptions({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('multipart/form-data');
  });
});
