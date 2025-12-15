import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK singleton
 * Used for server-side operations: FCM, Auth verification
 */

let firebaseAdmin: App | null = null;
let messaging: Messaging | null = null;
let auth: Auth | null = null;

/**
 * Get Firebase Admin credentials from environment
 */
function getFirebaseCredentials() {
  // Try to get credentials from environment variable (JSON string)
  const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (credentialsJson) {
    try {
      return JSON.parse(credentialsJson);
    } catch {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
    }
  }

  // Try individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): App {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdmin = existingApps[0];
    return firebaseAdmin;
  }

  const credentials = getFirebaseCredentials();

  if (!credentials) {
    throw new Error(
      'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT or individual FIREBASE_* env vars.'
    );
  }

  firebaseAdmin = initializeApp({
    credential: cert(credentials),
    projectId: credentials.projectId || credentials.project_id,
  });

  return firebaseAdmin;
}

/**
 * Get Firebase Messaging instance
 */
export function getFirebaseMessaging(): Messaging {
  if (messaging) {
    return messaging;
  }

  initializeFirebaseAdmin();
  messaging = getMessaging();
  return messaging;
}

/**
 * Get Firebase Auth instance (for server-side verification)
 */
export function getFirebaseAuth(): Auth {
  if (auth) {
    return auth;
  }

  initializeFirebaseAdmin();
  auth = getAuth();
  return auth;
}

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string
): Promise<string> {
  const messaging = getFirebaseMessaging();

  const message = {
    token,
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl }),
    },
    ...(data && { data }),
    webpush: {
      fcmOptions: {
        link: data?.link || process.env.NEXT_PUBLIC_APP_URL || '/',
      },
      notification: {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      },
    },
  };

  return messaging.send(message);
}

/**
 * Send push notification to multiple devices
 */
export async function sendMulticastNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  const messaging = getFirebaseMessaging();

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  const message = {
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl }),
    },
    ...(data && { data }),
    webpush: {
      fcmOptions: {
        link: data?.link || process.env.NEXT_PUBLIC_APP_URL || '/',
      },
      notification: {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      },
    },
    tokens,
  };

  const response = await messaging.sendEachForMulticast(message);

  const failedTokens: string[] = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      failedTokens.push(tokens[idx]);
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    failedTokens,
  };
}

/**
 * Send notification to a topic
 */
export async function sendTopicNotification(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string
): Promise<string> {
  const messaging = getFirebaseMessaging();

  const message = {
    topic,
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl }),
    },
    ...(data && { data }),
    webpush: {
      fcmOptions: {
        link: data?.link || process.env.NEXT_PUBLIC_APP_URL || '/',
      },
      notification: {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      },
    },
  };

  return messaging.send(message);
}

/**
 * Subscribe tokens to a topic
 */
export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  const messaging = getFirebaseMessaging();
  const response = await messaging.subscribeToTopic(tokens, topic);
  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}

/**
 * Unsubscribe tokens from a topic
 */
export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  const messaging = getFirebaseMessaging();
  const response = await messaging.unsubscribeFromTopic(tokens, topic);
  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  return auth.verifyIdToken(idToken);
}

/**
 * Get user by UID from Firebase Auth
 */
export async function getFirebaseUser(uid: string) {
  const auth = getFirebaseAuth();
  return auth.getUser(uid);
}
