import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken, getFirebaseUser } from '@/lib/firebase/admin';

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

    // Firebase Auth provider - accepts Firebase ID token and verifies with Firebase Admin
    Credentials({
      id: 'firebase',
      name: 'Firebase',
      credentials: {
        idToken: { label: 'Firebase ID Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          return null;
        }

        try {
          const idToken = credentials.idToken as string;

          // Verify the Firebase ID token
          const decodedToken = await verifyIdToken(idToken);

          if (!decodedToken) {
            return null;
          }

          // Get additional user info from Firebase
          const firebaseUser = await getFirebaseUser(decodedToken.uid);

          // Find or create user in database
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: firebaseUser.email },
                {
                  accounts: {
                    some: {
                      provider: 'firebase',
                      providerAccountId: decodedToken.uid
                    }
                  }
                },
              ],
            },
            include: { accounts: true },
          });

          if (!user && firebaseUser.email) {
            // Create new user
            user = await prisma.user.create({
              data: {
                email: firebaseUser.email,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                image: firebaseUser.photoURL,
                emailVerified: firebaseUser.emailVerified ? new Date() : null,
                accounts: {
                  create: {
                    type: 'oauth',
                    provider: 'firebase',
                    providerAccountId: decodedToken.uid,
                    access_token: idToken,
                    token_type: 'bearer',
                    id_token: idToken,
                  },
                },
              },
              include: { accounts: true },
            });
          } else if (user) {
            // Check if firebase account exists
            const hasFirebaseAccount = user.accounts?.some(
              (acc) => acc.provider === 'firebase' && acc.providerAccountId === decodedToken.uid
            );

            if (!hasFirebaseAccount) {
              // Link Firebase account to existing user
              await prisma.account.create({
                data: {
                  userId: user.id,
                  type: 'oauth',
                  provider: 'firebase',
                  providerAccountId: decodedToken.uid,
                  access_token: idToken,
                  token_type: 'bearer',
                  id_token: idToken,
                },
              });
            } else {
              // Update existing account with new token
              await prisma.account.updateMany({
                where: {
                  userId: user.id,
                  provider: 'firebase',
                  providerAccountId: decodedToken.uid,
                },
                data: {
                  access_token: idToken,
                  id_token: idToken,
                },
              });
            }

            // Update user info if changed
            if (
              firebaseUser.displayName !== user.name ||
              firebaseUser.photoURL !== user.image
            ) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  name: firebaseUser.displayName || user.name,
                  image: firebaseUser.photoURL || user.image,
                },
              });
            }
          }

          if (!user) {
            return null;
          }

          if (!user.isActive) {
            throw new Error('Account is disabled');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          console.error('[Auth] Firebase token verification failed:', error);
          return null;
        }
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
