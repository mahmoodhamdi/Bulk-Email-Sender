import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

/**
 * NextAuth.js configuration
 */
export const authConfig: NextAuthConfig = {
  providers: [
    // Email/Password authentication
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        if (!user.isActive) {
          throw new Error('Account is disabled');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),

    // Google OAuth (optional - configure if needed)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // GitHub OAuth (optional - configure if needed)
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/auth/register',
  },

  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth sign-in
      if (account?.provider !== 'credentials') {
        return true;
      }

      // For credentials, user must exist and be active
      if (!user?.id) {
        return false;
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle session update
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.email = session.email;
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      // Log sign-in event
      console.log(`[Auth] User signed in: ${user.email} via ${account?.provider}`);

      // Create user record for OAuth if new
      if (isNewUser && account?.provider !== 'credentials') {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

/**
 * Password hashing utility
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Password verification utility
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Check if user has required role
 */
export function hasRole(
  session: { user?: { role?: string } } | null | undefined,
  requiredRoles: string[]
): boolean {
  if (!session?.user?.role) return false;
  return requiredRoles.includes(session.user.role);
}

/**
 * Check if user is admin (ADMIN or SUPER_ADMIN)
 */
export function isAdmin(
  session: { user?: { role?: string } } | null | undefined
): boolean {
  return hasRole(session, ['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(
  session: { user?: { role?: string } } | null | undefined
): boolean {
  return session?.user?.role === 'SUPER_ADMIN';
}
