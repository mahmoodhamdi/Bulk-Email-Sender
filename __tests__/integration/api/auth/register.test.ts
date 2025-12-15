import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock auth functions
vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockImplementation((password: string) =>
    Promise.resolve(`hashed_${password}`)
  ),
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  authRateLimiter: {
    check: vi.fn().mockResolvedValue({ success: true }),
  },
}));

import { prisma } from '@/lib/db/prisma';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
    });
  };

  it('should register a new user successfully', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'USER',
      createdAt: new Date(),
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);

    const request = createRequest({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Account created successfully');
    expect(data.data.email).toBe('john@example.com');
  });

  it('should return 409 if email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-user',
      email: 'existing@example.com',
    } as never);

    const request = createRequest({
      name: 'John Doe',
      email: 'existing@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('An account with this email already exists');
  });

  it('should return 400 for invalid email', async () => {
    const request = createRequest({
      name: 'John Doe',
      email: 'invalid-email',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('should return 400 for weak password', async () => {
    const request = createRequest({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'weak',
      confirmPassword: 'weak',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('should return 400 for mismatched passwords', async () => {
    const request = createRequest({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'DifferentPassword123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('should return 400 for missing name', async () => {
    const request = createRequest({
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('should return 400 for short name', async () => {
    const request = createRequest({
      name: 'J',
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('should return 429 when rate limited', async () => {
    const { authRateLimiter } = await import('@/lib/rate-limit');
    vi.mocked(authRateLimiter.check).mockResolvedValueOnce({
      success: false,
      resetAt: new Date(),
    } as never);

    const request = createRequest({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });

  it('should handle empty request body', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: '',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('should create user with USER role by default', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockImplementation((({ data }) => {
      expect(data.role).toBe('USER');
      return Promise.resolve({
        id: 'user-1',
        ...data,
        createdAt: new Date(),
      });
    }) as never);

    const request = createRequest({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    await POST(request);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'USER',
        }),
      })
    );
  });

  it('should hash the password before storing', async () => {
    const { hashPassword } = await import('@/lib/auth');

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockImplementation((({ data }) => {
      expect(data.password).toBe('hashed_Password123');
      return Promise.resolve({
        id: 'user-1',
        ...data,
        createdAt: new Date(),
      });
    }) as never);

    const request = createRequest({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    await POST(request);

    expect(hashPassword).toHaveBeenCalledWith('Password123');
  });
});
