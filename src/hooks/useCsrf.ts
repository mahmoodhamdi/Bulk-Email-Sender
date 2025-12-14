'use client';

import { useCallback, useMemo } from 'react';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

/**
 * Get CSRF token from cookies
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return value;
    }
  }
  return null;
}

/**
 * Hook to get CSRF token and create fetch options with CSRF header
 */
export function useCsrf() {
  const token = useMemo(() => getCsrfToken(), []);

  /**
   * Get headers object with CSRF token included
   */
  const getHeaders = useCallback(
    (additionalHeaders?: HeadersInit): HeadersInit => {
      const csrfToken = getCsrfToken(); // Get fresh token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers[CSRF_HEADER_NAME] = csrfToken;
      }

      if (additionalHeaders) {
        if (additionalHeaders instanceof Headers) {
          additionalHeaders.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (Array.isArray(additionalHeaders)) {
          additionalHeaders.forEach(([key, value]) => {
            headers[key] = value;
          });
        } else {
          Object.assign(headers, additionalHeaders);
        }
      }

      return headers;
    },
    []
  );

  /**
   * Wrapper around fetch that automatically includes CSRF token
   */
  const csrfFetch = useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      const csrfToken = getCsrfToken();
      const headers = new Headers(options?.headers);

      if (csrfToken) {
        headers.set(CSRF_HEADER_NAME, csrfToken);
      }

      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
    []
  );

  return {
    token,
    getHeaders,
    csrfFetch,
  };
}

/**
 * Standalone function to get CSRF-protected fetch options
 * Useful for non-hook contexts
 */
export function getCsrfFetchOptions(options?: RequestInit): RequestInit {
  const csrfToken = getCsrfToken();
  const headers = new Headers(options?.headers);

  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...options,
    headers,
  };
}
