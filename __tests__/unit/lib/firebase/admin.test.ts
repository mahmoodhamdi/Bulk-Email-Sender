import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set up environment before importing the module
const mockCredentials = {
  projectId: 'test-project',
  clientEmail: 'test@test-project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
};

// Mock firebase-admin modules
const mockSend = vi.fn();
const mockSendEachForMulticast = vi.fn();
const mockSubscribeToTopic = vi.fn();
const mockUnsubscribeFromTopic = vi.fn();
const mockVerifyIdToken = vi.fn();
const mockGetUser = vi.fn();

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
  cert: vi.fn((creds) => creds),
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    send: mockSend,
    sendEachForMulticast: mockSendEachForMulticast,
    subscribeToTopic: mockSubscribeToTopic,
    unsubscribeFromTopic: mockUnsubscribeFromTopic,
  })),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
    getUser: mockGetUser,
  })),
}));

describe('Firebase Admin SDK', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(mockCredentials);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initializeFirebaseAdmin', () => {
    it('should initialize with FIREBASE_SERVICE_ACCOUNT JSON', async () => {
      const { initializeFirebaseAdmin } = await import('@/lib/firebase/admin');
      const { cert } = await import('firebase-admin/app');

      initializeFirebaseAdmin();

      expect(cert).toHaveBeenCalledWith(mockCredentials);
    });

    it('should initialize with individual environment variables', async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT;
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----';

      vi.resetModules();
      const { initializeFirebaseAdmin } = await import('@/lib/firebase/admin');
      const { cert } = await import('firebase-admin/app');

      initializeFirebaseAdmin();

      expect(cert).toHaveBeenCalledWith({
        projectId: 'test-project',
        clientEmail: 'test@test-project.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      });
    });

    it('should throw error when no credentials provided', async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT;
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;

      vi.resetModules();
      const { initializeFirebaseAdmin } = await import('@/lib/firebase/admin');

      expect(() => initializeFirebaseAdmin()).toThrow(
        'Firebase credentials not found'
      );
    });
  });

  describe('sendPushNotification', () => {
    it('should send notification to a single token', async () => {
      const mockMessageId = 'projects/test/messages/123';
      mockSend.mockResolvedValueOnce(mockMessageId);

      const { sendPushNotification } = await import('@/lib/firebase/admin');

      const result = await sendPushNotification(
        'test-token',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe(mockMessageId);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
          notification: {
            title: 'Test Title',
            body: 'Test Body',
          },
        })
      );
    });

    it('should include data and imageUrl when provided', async () => {
      const mockMessageId = 'projects/test/messages/456';
      mockSend.mockResolvedValueOnce(mockMessageId);

      const { sendPushNotification } = await import('@/lib/firebase/admin');

      await sendPushNotification(
        'test-token',
        'Test Title',
        'Test Body',
        { key: 'value' },
        'https://example.com/image.png'
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { key: 'value' },
          notification: expect.objectContaining({
            imageUrl: 'https://example.com/image.png',
          }),
        })
      );
    });
  });

  describe('sendMulticastNotification', () => {
    it('should return empty results for empty token array', async () => {
      const { sendMulticastNotification } = await import('@/lib/firebase/admin');

      const result = await sendMulticastNotification(
        [],
        'Test Title',
        'Test Body'
      );

      expect(result).toEqual({
        successCount: 0,
        failureCount: 0,
        failedTokens: [],
      });
    });

    it('should send to multiple tokens and track failures', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: true },
          { success: false, error: { code: 'messaging/invalid-registration-token' } },
        ],
      });

      const { sendMulticastNotification } = await import('@/lib/firebase/admin');

      const tokens = ['token1', 'token2', 'token3'];
      const result = await sendMulticastNotification(
        tokens,
        'Test Title',
        'Test Body'
      );

      expect(result).toEqual({
        successCount: 2,
        failureCount: 1,
        failedTokens: ['token3'],
      });
    });
  });

  describe('sendTopicNotification', () => {
    it('should send notification to a topic', async () => {
      const mockMessageId = 'projects/test/messages/789';
      mockSend.mockResolvedValueOnce(mockMessageId);

      const { sendTopicNotification } = await import('@/lib/firebase/admin');

      const result = await sendTopicNotification(
        'test-topic',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe(mockMessageId);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'test-topic',
        })
      );
    });
  });

  describe('subscribeToTopic', () => {
    it('should subscribe tokens to topic', async () => {
      mockSubscribeToTopic.mockResolvedValueOnce({
        successCount: 2,
        failureCount: 0,
      });

      const { subscribeToTopic } = await import('@/lib/firebase/admin');

      const result = await subscribeToTopic(['token1', 'token2'], 'test-topic');

      expect(result).toEqual({
        successCount: 2,
        failureCount: 0,
      });
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should unsubscribe tokens from topic', async () => {
      mockUnsubscribeFromTopic.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 1,
      });

      const { unsubscribeFromTopic } = await import('@/lib/firebase/admin');

      const result = await unsubscribeFromTopic(['token1', 'token2'], 'test-topic');

      expect(result).toEqual({
        successCount: 1,
        failureCount: 1,
      });
    });
  });

  describe('verifyIdToken', () => {
    it('should verify and decode ID token', async () => {
      const mockDecodedToken = {
        uid: 'test-uid',
        email: 'test@example.com',
        email_verified: true,
      };
      mockVerifyIdToken.mockResolvedValueOnce(mockDecodedToken);

      const { verifyIdToken } = await import('@/lib/firebase/admin');

      const result = await verifyIdToken('test-id-token');

      expect(result).toEqual(mockDecodedToken);
      expect(mockVerifyIdToken).toHaveBeenCalledWith('test-id-token');
    });
  });

  describe('getFirebaseUser', () => {
    it('should get user by UID', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        emailVerified: true,
      };
      mockGetUser.mockResolvedValueOnce(mockUser);

      const { getFirebaseUser } = await import('@/lib/firebase/admin');

      const result = await getFirebaseUser('test-uid');

      expect(result).toEqual(mockUser);
      expect(mockGetUser).toHaveBeenCalledWith('test-uid');
    });
  });
});
