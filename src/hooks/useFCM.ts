'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessagePayload } from 'firebase/messaging';
import {
  requestNotificationPermission,
  onForegroundMessage,
} from '@/lib/firebase/client';

interface UseFCMOptions {
  onMessage?: (payload: MessagePayload) => void;
  autoRegister?: boolean;
}

interface UseFCMReturn {
  token: string | null;
  permission: NotificationPermission | null;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<string | null>;
  registerToken: (token: string) => Promise<boolean>;
  unregisterToken: () => Promise<boolean>;
}

/**
 * Hook for Firebase Cloud Messaging
 */
export function useFCM(options: UseFCMOptions = {}): UseFCMReturn {
  const { onMessage, autoRegister = false } = options;

  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      if (supported) {
        setPermission(Notification.permission);
      }
    }
  }, []);

  // Set up foreground message listener
  useEffect(() => {
    if (!isSupported || !onMessage) return;

    const unsubscribe = onForegroundMessage((payload) => {
      onMessage(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [isSupported, onMessage]);

  // Auto-register token on mount if permission granted
  useEffect(() => {
    if (autoRegister && isSupported && permission === 'granted') {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRegister, isSupported, permission]);

  /**
   * Request notification permission and get FCM token
   */
  const requestPermission = useCallback(async (): Promise<string | null> => {
    if (!isSupported) {
      setError('Notifications are not supported in this browser');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fcmToken = await requestNotificationPermission();
      setPermission(Notification.permission);

      if (fcmToken) {
        setToken(fcmToken);

        // Auto-register with backend
        if (autoRegister) {
          await registerToken(fcmToken);
        }

        return fcmToken;
      } else {
        if (Notification.permission === 'denied') {
          setError('Notification permission was denied');
        }
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get FCM token';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, autoRegister]);

  /**
   * Register FCM token with backend
   */
  const registerToken = useCallback(async (fcmToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/fcm/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: fcmToken,
          deviceInfo: {
            platform: 'web',
            browser: navigator.userAgent.includes('Chrome')
              ? 'Chrome'
              : navigator.userAgent.includes('Firefox')
              ? 'Firefox'
              : navigator.userAgent.includes('Safari')
              ? 'Safari'
              : 'Other',
            os: navigator.platform,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register token';
      setError(message);
      return false;
    }
  }, []);

  /**
   * Unregister FCM token from backend
   */
  const unregisterToken = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch('/api/fcm/token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to unregister token');
      }

      setToken(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unregister token';
      setError(message);
      return false;
    }
  }, [token]);

  return {
    token,
    permission,
    isSupported,
    isLoading,
    error,
    requestPermission,
    registerToken,
    unregisterToken,
  };
}

export default useFCM;
