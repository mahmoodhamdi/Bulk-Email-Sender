import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Firebase client
vi.mock('@/lib/firebase/client', () => ({
  signInWithGoogle: vi.fn(),
  signInWithGoogleRedirect: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn(),
}));

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  signOut as firebaseSignOut,
  getIdToken,
} from '@/lib/firebase/client';

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('useFirebaseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  describe('initial state', () => {
    it('should have isLoading as false initially', () => {
      const { result } = renderHook(() => useFirebaseAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have error as null initially', () => {
      const { result } = renderHook(() => useFirebaseAuth());
      expect(result.current.error).toBeNull();
    });
  });

  describe('signInWithFirebaseGoogle', () => {
    it('should sign in successfully with popup flow', async () => {
      const mockUser = { uid: 'user-123', email: 'test@example.com' };
      vi.mocked(signInWithGoogle).mockResolvedValueOnce(mockUser as never);
      vi.mocked(getIdToken).mockResolvedValueOnce('firebase-id-token');
      vi.mocked(nextAuthSignIn).mockResolvedValueOnce({
        error: null,
        status: 200,
        ok: true,
        url: '/dashboard',
      });

      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signInWithFirebaseGoogle();
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
      expect(signInWithGoogle).toHaveBeenCalled();
      expect(getIdToken).toHaveBeenCalledWith(true);
      expect(nextAuthSignIn).toHaveBeenCalledWith('firebase', {
        idToken: 'firebase-id-token',
        callbackUrl: '/',
        redirect: false,
      });
    });

    it('should redirect after successful sign in', async () => {
      vi.mocked(signInWithGoogle).mockResolvedValueOnce({ uid: 'user' } as never);
      vi.mocked(getIdToken).mockResolvedValueOnce('token');
      vi.mocked(nextAuthSignIn).mockResolvedValueOnce({
        error: null,
        url: '/dashboard',
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useFirebaseAuth({ redirect: true }));

      await act(async () => {
        await result.current.signInWithFirebaseGoogle();
      });

      expect(mockLocation.href).toBe('/dashboard');
    });

    it('should not redirect when redirect option is false', async () => {
      vi.mocked(signInWithGoogle).mockResolvedValueOnce({ uid: 'user' } as never);
      vi.mocked(getIdToken).mockResolvedValueOnce('token');
      vi.mocked(nextAuthSignIn).mockResolvedValueOnce({
        error: null,
        url: '/dashboard',
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useFirebaseAuth({ redirect: false }));

      await act(async () => {
        await result.current.signInWithFirebaseGoogle();
      });

      expect(mockLocation.href).toBe('');
    });

    it('should use redirect flow when useRedirect is true', async () => {
      vi.mocked(signInWithGoogleRedirect).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useFirebaseAuth({ useRedirect: true }));

      await act(async () => {
        await result.current.signInWithFirebaseGoogle();
      });

      expect(signInWithGoogleRedirect).toHaveBeenCalled();
      expect(signInWithGoogle).not.toHaveBeenCalled();
    });

    it('should set error when Google sign in fails', async () => {
      vi.mocked(signInWithGoogle).mockResolvedValueOnce(null as never);

      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signInWithFirebaseGoogle();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to sign in with Google');
    });

    it('should set error when getting ID token fails', async () => {
      vi.mocked(signInWithGoogle).mockResolvedValueOnce({ uid: 'user' } as never);
      vi.mocked(getIdToken).mockResolvedValueOnce(null);

      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signInWithFirebaseGoogle();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to get Firebase ID token');
      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should set error when NextAuth sign in fails', async () => {
      vi.mocked(signInWithGoogle).mockResolvedValueOnce({ uid: 'user' } as never);
      vi.mocked(getIdToken).mockResolvedValueOnce('token');
      vi.mocked(nextAuthSignIn).mockResolvedValueOnce({
        error: 'Invalid credentials',
        ok: false,
        status: 401,
        url: null,
      });

      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signInWithFirebaseGoogle();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      vi.mocked(signInWithGoogle).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signInWithFirebaseGoogle();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(signInWithGoogle).mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signInWithFirebaseGoogle();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('An unexpected error occurred');
    });

    it('should set isLoading during sign in process', async () => {
      vi.mocked(signInWithGoogle).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ uid: 'user' } as never), 100))
      );
      vi.mocked(getIdToken).mockResolvedValueOnce('token');
      vi.mocked(nextAuthSignIn).mockResolvedValueOnce({ error: null, ok: true, status: 200, url: '/' });

      const { result } = renderHook(() => useFirebaseAuth({ redirect: false }));

      let promise: Promise<boolean>;
      act(() => {
        promise = result.current.signInWithFirebaseGoogle();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should use custom callbackUrl', async () => {
      vi.mocked(signInWithGoogle).mockResolvedValueOnce({ uid: 'user' } as never);
      vi.mocked(getIdToken).mockResolvedValueOnce('token');
      vi.mocked(nextAuthSignIn).mockResolvedValueOnce({ error: null, ok: true, status: 200, url: '/custom' });

      const { result } = renderHook(() =>
        useFirebaseAuth({ callbackUrl: '/custom', redirect: false })
      );

      await act(async () => {
        await result.current.signInWithFirebaseGoogle();
      });

      expect(nextAuthSignIn).toHaveBeenCalledWith('firebase', {
        idToken: 'token',
        callbackUrl: '/custom',
        redirect: false,
      });
    });
  });

  describe('signOutFromAll', () => {
    it('should sign out from both Firebase and NextAuth', async () => {
      vi.mocked(firebaseSignOut).mockResolvedValueOnce(undefined);
      vi.mocked(nextAuthSignOut).mockResolvedValueOnce(undefined as never);

      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signOutFromAll();
      });

      expect(firebaseSignOut).toHaveBeenCalled();
      expect(nextAuthSignOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' });
    });

    it('should set error when sign out fails', async () => {
      vi.mocked(firebaseSignOut).mockRejectedValueOnce(new Error('Sign out failed'));

      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signOutFromAll();
      });

      expect(result.current.error).toBe('Sign out failed');
    });

    it('should handle non-Error exceptions during sign out', async () => {
      vi.mocked(firebaseSignOut).mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signOutFromAll();
      });

      expect(result.current.error).toBe('Failed to sign out');
    });

    it('should set isLoading during sign out', async () => {
      vi.mocked(firebaseSignOut).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      vi.mocked(nextAuthSignOut).mockResolvedValueOnce(undefined as never);

      const { result } = renderHook(() => useFirebaseAuth());

      let promise: Promise<void>;
      act(() => {
        promise = result.current.signOutFromAll();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
