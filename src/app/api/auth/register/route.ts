import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth';
import { authRateLimiter } from '@/lib/rate-limit';
import { registerSchema } from '@/lib/validations/auth';

/**
 * POST /api/auth/register - Register a new user
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await authRateLimiter.check(
    request.headers.get('x-forwarded-for') || 'anonymous'
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        data: user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
