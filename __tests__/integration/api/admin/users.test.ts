import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/admin/users/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/admin/users/[id]/route';
import { NextRequest } from 'next/server';

// Mock auth functions
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  isAdmin: vi.fn().mockImplementation((session) => {
    if (!session?.user?.role) return false;
    return ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role);
  }),
  isSuperAdmin: vi.fn().mockImplementation((session) => {
    return session?.user?.role === 'SUPER_ADMIN';
  }),
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { auth, isAdmin, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('/api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminSession = {
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    },
  };

  const mockSuperAdminSession = {
    user: {
      id: 'super-1',
      email: 'super@example.com',
      role: 'SUPER_ADMIN',
    },
  };

  const mockUserSession = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    },
  };

  const mockUsers = [
    {
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      image: null,
      role: 'USER',
      isActive: true,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        campaigns: 5,
        contacts: 100,
        apiKeys: 2,
      },
    },
  ];

  describe('GET /api/admin/users', () => {
    it('should list users for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for non-admin users', async () => {
      vi.mocked(auth).mockResolvedValue(mockUserSession as never);

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should support pagination', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
      vi.mocked(prisma.user.count).mockResolvedValue(50);

      const request = new NextRequest('http://localhost/api/admin/users?page=2&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(5);
    });

    it('should support search filter', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/admin/users?search=test');
      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should support role filter', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/admin/users?role=USER');
      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'USER',
          }),
        })
      );
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should get user details for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUsers[0] as never);

      const response = await GET_BY_ID(
        new NextRequest('http://localhost/api/admin/users/user-1'),
        { params: Promise.resolve({ id: 'user-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('user-1');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET_BY_ID(
        new NextRequest('http://localhost/api/admin/users/user-1'),
        { params: Promise.resolve({ id: 'user-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent user', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await GET_BY_ID(
        new NextRequest('http://localhost/api/admin/users/non-existent'),
        { params: Promise.resolve({ id: 'non-existent' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    const createRequest = (body: object) => {
      return new NextRequest('http://localhost/api/admin/users/user-1', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    it('should update user for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUsers[0] as never);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUsers[0],
        name: 'Updated Name',
      } as never);

      const response = await PATCH(
        createRequest({ name: 'Updated Name' }),
        { params: Promise.resolve({ id: 'user-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });

    it('should return 400 when trying to modify own account', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);

      const response = await PATCH(
        createRequest({ role: 'SUPER_ADMIN' }),
        { params: Promise.resolve({ id: 'admin-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot modify your own');
    });

    it('should return 403 when non-super-admin tries to modify admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'other-admin',
        role: 'ADMIN',
      } as never);

      const response = await PATCH(
        createRequest({ name: 'Changed' }),
        { params: Promise.resolve({ id: 'other-admin' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only super admins');
    });

    it('should allow super admin to modify admin users', async () => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'other-admin',
        role: 'ADMIN',
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'other-admin',
        name: 'Changed',
        role: 'ADMIN',
      } as never);

      const response = await PATCH(
        createRequest({ name: 'Changed' }),
        { params: Promise.resolve({ id: 'other-admin' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 403 when non-super-admin tries to assign admin role', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUsers[0] as never);

      const response = await PATCH(
        createRequest({ role: 'ADMIN' }),
        { params: Promise.resolve({ id: 'user-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only super admins can assign admin roles');
    });

    it('should allow super admin to assign admin role', async () => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUsers[0] as never);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUsers[0],
        role: 'ADMIN',
      } as never);

      const response = await PATCH(
        createRequest({ role: 'ADMIN' }),
        { params: Promise.resolve({ id: 'user-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete user for super admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUsers[0] as never);
      vi.mocked(prisma.user.delete).mockResolvedValue(mockUsers[0] as never);

      const response = await DELETE(
        new NextRequest('http://localhost/api/admin/users/user-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'user-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('User deleted successfully');
    });

    it('should return 403 for non-super-admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as never);

      const response = await DELETE(
        new NextRequest('http://localhost/api/admin/users/user-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'user-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only super admins');
    });

    it('should return 400 when trying to delete own account', async () => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as never);

      const response = await DELETE(
        new NextRequest('http://localhost/api/admin/users/super-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'super-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete your own account');
    });

    it('should return 403 when trying to delete another super admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'other-super',
        role: 'SUPER_ADMIN',
      } as never);

      const response = await DELETE(
        new NextRequest('http://localhost/api/admin/users/other-super', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'other-super' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Cannot delete super admin');
    });

    it('should return 404 for non-existent user', async () => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest('http://localhost/api/admin/users/non-existent', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'non-existent' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });
});
