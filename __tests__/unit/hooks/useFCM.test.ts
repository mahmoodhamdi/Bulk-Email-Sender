import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFCM } from '@/hooks/useFCM';

// Mock the Firebase client
vi.mock('@/lib/firebase/client', () => ({
  requestNotificationPermission: vi.fn(),
  onForegroundMessage: vi.fn(() => vi.fn()),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useFCM', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.Notification
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
      },
      writable: true,
      configurable: true,
    });

    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {},
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFCM());

    expect(result.current.token).toBeNull();
    expect(result.current.permission).toBe('default');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSupported).toBe(true);
  });

  it('should detect when notifications are not supported', () => {
    // Remove Notification API by setting 'Notification' in window to undefined
    // but keep the Notification property configurable for cleanup
    const originalNotification = (global as typeof globalThis & { Notification?: unknown }).Notification;
    delete (global as typeof globalThis & { Notification?: unknown }).Notification;

    const { result } = renderHook(() => useFCM());

    expect(result.current.isSupported).toBe(false);

    // Restore Notification
    (global as typeof globalThis & { Notification?: unknown }).Notification = originalNotification;
  });

  it('should request permission and get token', async () => {
    const mockToken = 'mock-fcm-token-123';
    const { requestNotificationPermission } = await import('@/lib/firebase/client');
    vi.mocked(requestNotificationPermission).mockResolvedValueOnce(mockToken);

    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'granted',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useFCM());

    await act(async () => {
      const token = await result.current.requestPermission();
      expect(token).toBe(mockToken);
    });

    expect(result.current.token).toBe(mockToken);
    expect(result.current.permission).toBe('granted');
    expect(result.current.error).toBeNull();
  });

  it('should set error when permission is denied', async () => {
    const { requestNotificationPermission } = await import('@/lib/firebase/client');
    vi.mocked(requestNotificationPermission).mockResolvedValueOnce(null);

    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'denied',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useFCM());

    await act(async () => {
      const token = await result.current.requestPermission();
      expect(token).toBeNull();
    });

    expect(result.current.error).toBe('Notification permission was denied');
  });

  it('should handle requestPermission error', async () => {
    const { requestNotificationPermission } = await import('@/lib/firebase/client');
    vi.mocked(requestNotificationPermission).mockRejectedValueOnce(
      new Error('Firebase error')
    );

    const { result } = renderHook(() => useFCM());

    await act(async () => {
      const token = await result.current.requestPermission();
      expect(token).toBeNull();
    });

    expect(result.current.error).toBe('Firebase error');
  });

  it('should register token with backend', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useFCM());

    await act(async () => {
      const success = await result.current.registerToken('test-token');
      expect(success).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/fcm/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('test-token'),
    });
  });

  it('should handle register token error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed' }),
    });

    const { result } = renderHook(() => useFCM());

    await act(async () => {
      const success = await result.current.registerToken('test-token');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Failed to register token');
  });

  it('should unregister token from backend', async () => {
    const mockToken = 'test-token-to-unregister';

    // First register a token
    const { requestNotificationPermission } = await import('@/lib/firebase/client');
    vi.mocked(requestNotificationPermission).mockResolvedValueOnce(mockToken);

    Object.defineProperty(global, 'Notification', {
      value: { permission: 'granted' },
      writable: true,
      configurable: true,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useFCM());

    // Request permission to set the token
    await act(async () => {
      await result.current.requestPermission();
    });

    // Now unregister
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await act(async () => {
      const success = await result.current.unregisterToken();
      expect(success).toBe(true);
    });

    expect(result.current.token).toBeNull();
  });

  it('should set up foreground message listener', async () => {
    const mockCallback = vi.fn();
    const { onForegroundMessage } = await import('@/lib/firebase/client');

    renderHook(() => useFCM({ onMessage: mockCallback }));

    expect(onForegroundMessage).toHaveBeenCalled();
  });

  it('should auto-register when autoRegister is true and permission is granted', async () => {
    const mockToken = 'auto-register-token';
    const { requestNotificationPermission } = await import('@/lib/firebase/client');
    vi.mocked(requestNotificationPermission).mockResolvedValueOnce(mockToken);

    Object.defineProperty(global, 'Notification', {
      value: { permission: 'granted' },
      writable: true,
      configurable: true,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderHook(() => useFCM({ autoRegister: true }));

    await waitFor(() => {
      expect(requestNotificationPermission).toHaveBeenCalled();
    });
  });
});
