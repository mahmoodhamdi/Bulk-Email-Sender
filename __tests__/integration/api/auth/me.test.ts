import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, PUT } from '@/app/api/auth/me/route';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  hashPassword: vi.fn().mockImplementation((password: string) =>
    Promise.resolve(`hashed_${password}`)
  ),
  verifyPassword: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('/api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
    },
  };

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    image: null,
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      campaigns: 5,
      templates: 3,
      contacts: 100,
      contactLists: 2,
      smtpConfigs: 1,
      apiKeys: 2,
    },
  };

  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('user-1');
      expect(data.data.email).toBe('test@example.com');
      expect(data.data._count.campaigns).toBe(5);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('PATCH /api/auth/me', () => {
    const createRequest = (body: object) => {
      return new NextRequest('http://localhost/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    it('should update user profile successfully', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      } as never);

      const request = createRequest({ name: 'Updated Name' });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createRequest({ name: 'Updated Name' });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 409 when email is already in use', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'other-user',
        email: 'new@example.com',
      } as never);

      const request = createRequest({ email: 'new@example.com' });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Email already in use');
    });

    it('should allow updating email if not taken', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      } as never);

      const request = createRequest({ email: 'new@example.com' });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid data', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = createRequest({ email: 'invalid-email' });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('PUT /api/auth/me (change password)', () => {
    const createRequest = (body: object) => {
      return new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    it('should change password successfully', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: 'hashed_OldPassword123',
      } as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const request = createRequest({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password changed successfully');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createRequest({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for OAuth accounts without password', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: null,
      } as never);

      const request = createRequest({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password change not available for OAuth accounts');
    });

    it('should return 400 for incorrect current password', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: 'hashed_password',
      } as never);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const request = createRequest({
        currentPassword: 'WrongPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Current password is incorrect');
    });

    it('should return 400 for weak new password', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = createRequest({
        currentPassword: 'OldPassword123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 400 for mismatched passwords', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = createRequest({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'DifferentPassword456',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });
});
