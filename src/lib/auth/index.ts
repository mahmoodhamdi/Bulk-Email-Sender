import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db/prisma';
import { authConfig } from './config';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
});

// Re-export utilities
export {
  hashPassword,
  verifyPassword,
  hasRole,
  isAdmin,
  isSuperAdmin,
} from './config';

// Re-export API key utilities
export {
  generateApiKey,
  hashApiKey,
  extractApiKey,
  validateApiKey,
  hasPermission,
  checkApiKeyRateLimit,
} from './api-key';

// Re-export middleware
export {
  authenticateRequest,
  requireAuth,
  requirePermission,
  requireAdmin,
  requireSuperAdmin,
  withAuth,
  createErrorResponse,
  createSuccessResponse,
  type AuthContext,
} from './middleware';

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: string;
  }
}
