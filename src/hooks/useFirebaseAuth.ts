'use client';

import { useState, useCallback } from 'react';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  signOut as firebaseSignOut,
  getIdToken,
} from '@/lib/firebase/client';

interface UseFirebaseAuthOptions {
  callbackUrl?: string;
  redirect?: boolean;
  useRedirect?: boolean;
}

interface UseFirebaseAuthReturn {
  signInWithFirebaseGoogle: () => Promise<boolean>;
  signOutFromAll: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for Firebase Authentication integrated with NextAuth
 *
 * This hook handles the following flow:
 * 1. User signs in with Firebase (Google)
 * 2. Firebase returns ID token
 * 3. ID token is sent to NextAuth's Firebase credentials provider
 * 4. NextAuth verifies token and creates session
 */
export function useFirebaseAuth(
  options: UseFirebaseAuthOptions = {}
): UseFirebaseAuthReturn {
  const { callbackUrl = '/', redirect = true, useRedirect = false } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign in with Google via Firebase, then create NextAuth session
   */
  const signInWithFirebaseGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      let user;

      if (useRedirect) {
        // Use redirect flow (for mobile/browsers that block popups)
        await signInWithGoogleRedirect();
        // The page will redirect, so we won't reach here
        return true;
      } else {
        // Use popup flow
        user = await signInWithGoogle();
      }

      if (!user) {
        setError('Failed to sign in with Google');
        return false;
      }

      // Get the Firebase ID token
      const idToken = await getIdToken(true);

      if (!idToken) {
        setError('Failed to get Firebase ID token');
        await firebaseSignOut();
        return false;
      }

      // Sign in with NextAuth using the Firebase credentials provider
      // Always use redirect: false to capture the result, then redirect manually if needed
      const result = await nextAuthSignIn('firebase', {
        idToken,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        await firebaseSignOut();
        return false;
      }

      // Manually redirect if requested
      if (redirect && result?.url) {
        window.location.href = result.url;
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [callbackUrl, redirect, useRedirect]);

  /**
   * Sign out from both Firebase and NextAuth
   */
  const signOutFromAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign out from Firebase
      await firebaseSignOut();

      // Sign out from NextAuth
      await nextAuthSignOut({ callbackUrl: '/auth/signin' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signInWithFirebaseGoogle,
    signOutFromAll,
    isLoading,
    error,
  };
}

export default useFirebaseAuth;
