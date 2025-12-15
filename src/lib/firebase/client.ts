import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';

/**
 * Firebase client configuration
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase client app
 */
export function initializeFirebase(): FirebaseApp {
  if (app) {
    return app;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  app = initializeApp(firebaseConfig);
  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseClientAuth(): Auth {
  if (auth) {
    return auth;
  }

  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used on the client side');
  }

  initializeFirebase();
  auth = getAuth();
  return auth;
}

/**
 * Get Firebase Messaging instance (client-side)
 */
export function getFirebaseClientMessaging(): Messaging | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (messaging) {
    return messaging;
  }

  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return null;
  }

  try {
    initializeFirebase();
    messaging = getMessaging();
    return messaging;
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    const fcmMessaging = getFirebaseClientMessaging();
    if (!fcmMessaging) {
      return null;
    }

    // Get the VAPID key from environment
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    // Register service worker if not already registered
    const registration = await registerServiceWorker();
    if (!registration) {
      return null;
    }

    const token = await getToken(fcmMessaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * Register FCM service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: MessagePayload) => void): () => void {
  const fcmMessaging = getFirebaseClientMessaging();
  if (!fcmMessaging) {
    return () => {};
  }

  return onMessage(fcmMessaging, callback);
}

/**
 * Google sign-in with popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const auth = getFirebaseClientAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    return null;
  }
}

/**
 * Google sign-in with redirect (for mobile)
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  const auth = getFirebaseClientAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  await signInWithRedirect(auth, provider);
}

/**
 * Sign out from Firebase
 */
export async function signOut(): Promise<void> {
  const auth = getFirebaseClientAuth();
  await firebaseSignOut(auth);
}

/**
 * Get current Firebase user
 */
export function getCurrentUser(): User | null {
  const auth = getFirebaseClientAuth();
  return auth.currentUser;
}

/**
 * Listen for auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseClientAuth();
  return onAuthStateChanged(auth, callback);
}

/**
 * Get Firebase ID token for the current user
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseClientAuth();
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return user.getIdToken(forceRefresh);
}
