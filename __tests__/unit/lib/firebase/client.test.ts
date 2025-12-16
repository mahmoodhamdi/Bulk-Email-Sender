import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase App
const mockApp = { name: 'test-app' };
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApps: vi.fn(() => []),
}));

// Mock Firebase Auth
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
};

const mockAuth = {
  currentUser: mockUser,
};

const mockSignInResult = {
  user: mockUser,
};

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithPopup: vi.fn(() => Promise.resolve(mockSignInResult)),
  signInWithRedirect: vi.fn(() => Promise.resolve()),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({
    addScope: vi.fn(),
  })),
  signOut: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(mockUser);
    return () => {};
  }),
}));

// Mock Firebase Messaging
const mockMessaging = { app: mockApp };
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => mockMessaging),
  getToken: vi.fn(() => Promise.resolve('mock-fcm-token')),
  onMessage: vi.fn((messaging, callback) => {
    return () => {};
  }),
}));

import { initializeApp, getApps } from 'firebase/app';
import { signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';

describe('Firebase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state
    vi.resetModules();

    // Setup window.Notification mock
    Object.defineProperty(window, 'Notification', {
      value: {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
      configurable: true,
    });

    // Setup navigator.serviceWorker mock
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue({ scope: '/' }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('initializeFirebase', () => {
    it('should initialize Firebase app', async () => {
      const { initializeFirebase } = await import('@/lib/firebase/client');
      const app = initializeFirebase();
      expect(app).toBeDefined();
      expect(initializeApp).toHaveBeenCalled();
    });

    it('should return existing app if already initialized', async () => {
      const { initializeFirebase } = await import('@/lib/firebase/client');
      const app1 = initializeFirebase();
      const app2 = initializeFirebase();
      expect(app1).toBe(app2);
    });

    it('should use existing Firebase app', async () => {
      vi.mocked(getApps).mockReturnValue([mockApp] as never);
      vi.resetModules();
      const { initializeFirebase } = await import('@/lib/firebase/client');
      const app = initializeFirebase();
      expect(app).toBeDefined();
    });
  });

  describe('getFirebaseClientAuth', () => {
    it('should return auth instance', async () => {
      const { getFirebaseClientAuth } = await import('@/lib/firebase/client');
      const auth = getFirebaseClientAuth();
      expect(auth).toBeDefined();
    });

    it('should return the same auth instance on subsequent calls', async () => {
      const { getFirebaseClientAuth } = await import('@/lib/firebase/client');
      const auth1 = getFirebaseClientAuth();
      const auth2 = getFirebaseClientAuth();
      expect(auth1).toBe(auth2);
    });
  });

  describe('getFirebaseClientMessaging', () => {
    it('should return messaging instance when Notification is supported', async () => {
      const { getFirebaseClientMessaging } = await import('@/lib/firebase/client');
      const messaging = getFirebaseClientMessaging();
      expect(messaging).toBeDefined();
    });

    it('should return the same messaging instance on subsequent calls', async () => {
      const { getFirebaseClientMessaging } = await import('@/lib/firebase/client');
      const messaging1 = getFirebaseClientMessaging();
      const messaging2 = getFirebaseClientMessaging();
      expect(messaging1).toBe(messaging2);
    });

    it('should return null when Notification is not supported', async () => {
      delete (window as { Notification?: unknown }).Notification;
      vi.resetModules();
      const { getFirebaseClientMessaging } = await import('@/lib/firebase/client');
      const messaging = getFirebaseClientMessaging();
      expect(messaging).toBeNull();
    });
  });

  describe('requestNotificationPermission', () => {
    it('should request permission and return FCM token', async () => {
      vi.stubEnv('NEXT_PUBLIC_FIREBASE_VAPID_KEY', 'test-vapid-key');
      vi.resetModules();
      const { requestNotificationPermission } = await import('@/lib/firebase/client');
      const token = await requestNotificationPermission();
      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(token).toBe('mock-fcm-token');
    });

    it('should return null when permission is denied', async () => {
      (window.Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied');
      vi.resetModules();
      const { requestNotificationPermission } = await import('@/lib/firebase/client');
      const token = await requestNotificationPermission();
      expect(token).toBeNull();
    });

    it('should return null when VAPID key is not configured', async () => {
      delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      vi.resetModules();
      const { requestNotificationPermission } = await import('@/lib/firebase/client');
      const token = await requestNotificationPermission();
      expect(token).toBeNull();
    });
  });

  describe('registerServiceWorker', () => {
    it('should register service worker', async () => {
      const { registerServiceWorker } = await import('@/lib/firebase/client');
      const registration = await registerServiceWorker();
      expect(registration).toBeDefined();
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/firebase-messaging-sw.js');
    });

    it('should return null when registration fails', async () => {
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
      vi.resetModules();
      const { registerServiceWorker } = await import('@/lib/firebase/client');
      const registration = await registerServiceWorker();
      expect(registration).toBeNull();
    });
  });

  describe('onForegroundMessage', () => {
    it('should setup message listener', async () => {
      const { onForegroundMessage } = await import('@/lib/firebase/client');
      const callback = vi.fn();
      const unsubscribe = onForegroundMessage(callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should return no-op when messaging is not available', async () => {
      delete (window as { Notification?: unknown }).Notification;
      vi.resetModules();
      const { onForegroundMessage } = await import('@/lib/firebase/client');
      const callback = vi.fn();
      const unsubscribe = onForegroundMessage(callback);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with Google popup', async () => {
      const { signInWithGoogle } = await import('@/lib/firebase/client');
      const user = await signInWithGoogle();
      expect(user).toBeDefined();
      expect(user?.uid).toBe('test-uid');
      expect(signInWithPopup).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      vi.mocked(signInWithPopup).mockRejectedValueOnce(new Error('Sign in failed'));
      vi.resetModules();
      const { signInWithGoogle } = await import('@/lib/firebase/client');
      const user = await signInWithGoogle();
      expect(user).toBeNull();
    });
  });

  describe('signInWithGoogleRedirect', () => {
    it('should sign in with Google redirect', async () => {
      const { signInWithGoogleRedirect } = await import('@/lib/firebase/client');
      await signInWithGoogleRedirect();
      expect(signInWithRedirect).toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should sign out from Firebase', async () => {
      const { signOut } = await import('@/lib/firebase/client');
      await signOut();
      expect(firebaseSignOut).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const { getCurrentUser } = await import('@/lib/firebase/client');
      const user = getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.uid).toBe('test-uid');
    });
  });

  describe('onAuthChange', () => {
    it('should setup auth state listener', async () => {
      const { onAuthChange } = await import('@/lib/firebase/client');
      const callback = vi.fn();
      const unsubscribe = onAuthChange(callback);
      expect(typeof unsubscribe).toBe('function');
      expect(onAuthStateChanged).toHaveBeenCalled();
    });
  });

  describe('getIdToken', () => {
    it('should return ID token for current user', async () => {
      const { getIdToken } = await import('@/lib/firebase/client');
      const token = await getIdToken();
      expect(token).toBe('mock-id-token');
    });

    it('should force refresh when requested', async () => {
      const { getIdToken } = await import('@/lib/firebase/client');
      await getIdToken(true);
      expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    });

    it('should return null when no user is signed in', async () => {
      vi.resetModules();
      vi.doMock('firebase/auth', () => ({
        getAuth: vi.fn(() => ({ currentUser: null })),
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
        GoogleAuthProvider: vi.fn().mockImplementation(() => ({ addScope: vi.fn() })),
        signOut: vi.fn(),
        onAuthStateChanged: vi.fn(),
      }));
      const { getIdToken } = await import('@/lib/firebase/client');
      const token = await getIdToken();
      expect(token).toBeNull();
    });
  });
});
