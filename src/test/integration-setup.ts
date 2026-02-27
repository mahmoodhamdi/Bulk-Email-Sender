import { vi } from 'vitest';

// Set up environment variables for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/emailsender_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-integration-tests';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Mock next-auth to avoid ESM import issues with next/server
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(() => Promise.resolve({
      user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'USER' },
    })),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

// Mock auth module to provide withAuth that bypasses authentication
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'USER' },
  })),
  isAdmin: vi.fn(() => false),
  isSuperAdmin: vi.fn(() => false),
  hasRole: vi.fn(() => true),
  withAuth: vi.fn((handler) => {
    // Return a function that matches the Next.js route handler signature
    return async (request: unknown, routeContext?: unknown) => {
      const authContext = {
        type: 'session',
        userId: 'test-user-id',
        userRole: 'USER',
      };
      // Extract params from routeContext if provided (Next.js route format)
      let params: Record<string, string> | undefined;
      if (routeContext && typeof routeContext === 'object' && 'params' in routeContext) {
        const rc = routeContext as { params: Promise<Record<string, string>> | Record<string, string> };
        params = rc.params instanceof Promise ? await rc.params : rc.params;
      }
      return handler(request, authContext, params);
    };
  }),
  createErrorResponse: vi.fn((message: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message }, { status });
  }),
  createSuccessResponse: vi.fn((data: unknown, status = 200) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(data, { status });
  }),
  generateApiKey: vi.fn(),
  hashApiKey: vi.fn(),
  extractApiKey: vi.fn(),
  validateApiKey: vi.fn(),
  hasPermission: vi.fn(() => true),
  checkApiKeyRateLimit: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  authenticateRequest: vi.fn(),
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
  requireAdmin: vi.fn(),
  requireSuperAdmin: vi.fn(),
}));

// Mock external services if needed
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: vi.fn().mockResolvedValue(true),
  })),
}));

// Global cleanup
afterAll(async () => {
  // Cleanup database connections, etc.
});
