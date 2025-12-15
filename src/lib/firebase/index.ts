// Server-side exports (use only in API routes/server components)
export {
  initializeFirebaseAdmin,
  getFirebaseMessaging,
  getFirebaseAuth,
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  verifyIdToken,
  getFirebaseUser,
} from './admin';

// Client-side exports (use only in client components)
export {
  initializeFirebase,
  getFirebaseClientAuth,
  getFirebaseClientMessaging,
  requestNotificationPermission,
  registerServiceWorker,
  onForegroundMessage,
  signInWithGoogle,
  signInWithGoogleRedirect,
  signOut,
  getCurrentUser,
  onAuthChange,
  getIdToken,
} from './client';
