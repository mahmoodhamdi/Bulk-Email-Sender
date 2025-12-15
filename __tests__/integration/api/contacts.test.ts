import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/contacts/route';
import { GET as GETById, DELETE } from '@/app/api/contacts/[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: {
    check: vi.fn(() => ({ success: true, resetAt: Date.now() + 60000 })),
  },
}));

import { prisma } from '@/lib/db/prisma';

describe('Contacts API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/contacts', () => {
    it('should return contacts list with pagination', async () => {
      const mockContacts = [
        {
          id: 'cont-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'ACTIVE',
          _count: { recipients: 5, listMembers: 2 },
        },
      ];

      vi.mocked(prisma.contact.count).mockResolvedValue(1);
      vi.mocked(prisma.contact.findMany).mockResolvedValue(mockContacts as never);

      const request = new NextRequest('http://localhost:3000/api/contacts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
    });

    it('should filter contacts by status', async () => {
      vi.mocked(prisma.contact.count).mockResolvedValue(0);
      vi.mocked(prisma.contact.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/contacts?status=UNSUBSCRIBED');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'UNSUBSCRIBED' }),
        })
      );
    });
  });

  describe('POST /api/contacts', () => {
    it('should create a new contact', async () => {
      const newContact = {
        id: 'cont-new',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        status: 'ACTIVE',
        tags: [],
        createdAt: new Date(),
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.contact.create).mockResolvedValue(newContact as never);

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.email).toBe('new@example.com');
    });

    it('should return 409 for duplicate email', async () => {
      vi.mocked(prisma.contact.findUnique).mockResolvedValue({
        id: 'existing',
        email: 'existing@example.com',
      } as never);

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Contact with this email already exists');
    });

    it('should return validation error for invalid email', async () => {
      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('GET /api/contacts/[id]', () => {
    it('should return a single contact', async () => {
      const mockContact = {
        id: 'cont-1',
        email: 'test@example.com',
        firstName: 'John',
        status: 'ACTIVE',
        listMembers: [],
        recipients: [],
        _count: { recipients: 5, listMembers: 2 },
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as never);

      const request = new NextRequest('http://localhost:3000/api/contacts/cont-1');
      const response = await GETById(request, { params: Promise.resolve({ id: 'cont-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('cont-1');
    });

    it('should return 404 for non-existent contact', async () => {
      vi.mocked(prisma.contact.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/contacts/non-existent');
      const response = await GETById(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Contact not found');
    });
  });

  describe('DELETE /api/contacts/[id]', () => {
    it('should delete a contact', async () => {
      vi.mocked(prisma.contact.findUnique).mockResolvedValue({ id: 'cont-1' } as never);
      vi.mocked(prisma.contact.delete).mockResolvedValue({} as never);

      const request = new NextRequest('http://localhost:3000/api/contacts/cont-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'cont-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent contact', async () => {
      vi.mocked(prisma.contact.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/contacts/non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Contact not found');
    });
  });
});
