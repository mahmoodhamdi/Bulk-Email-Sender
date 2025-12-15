import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/templates/route';
import { GET as GETById, PUT, DELETE, POST as DUPLICATE } from '@/app/api/templates/[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    template: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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

describe('Templates API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/templates', () => {
    it('should return templates list with pagination', async () => {
      const mockTemplates = [
        {
          id: 'tpl-1',
          name: 'Test Template',
          content: '<p>Hello</p>',
          category: 'marketing',
          isDefault: false,
          _count: { campaigns: 3 },
        },
      ];

      vi.mocked(prisma.template.count).mockResolvedValue(1);
      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates as never);

      const request = new NextRequest('http://localhost:3000/api/templates');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
    });

    it('should filter templates by category', async () => {
      vi.mocked(prisma.template.count).mockResolvedValue(0);
      vi.mocked(prisma.template.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/templates?category=marketing');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'marketing' }),
        })
      );
    });

    it('should filter templates by isDefault', async () => {
      vi.mocked(prisma.template.count).mockResolvedValue(0);
      vi.mocked(prisma.template.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/templates?isDefault=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isDefault: true }),
        })
      );
    });
  });

  describe('POST /api/templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        id: 'tpl-new',
        name: 'New Template',
        content: '<p>Content</p>',
        isDefault: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.template.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.template.create).mockResolvedValue(newTemplate as never);

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Template',
          content: '<p>Content</p>',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe('New Template');
    });

    it('should return 409 for duplicate name', async () => {
      vi.mocked(prisma.template.findFirst).mockResolvedValue({
        id: 'existing',
        name: 'Existing Template',
      } as never);

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Existing Template',
          content: '<p>Content</p>',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Template with this name already exists');
    });

    it('should unset other defaults when setting isDefault', async () => {
      vi.mocked(prisma.template.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.template.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.template.create).mockResolvedValue({
        id: 'tpl-new',
        name: 'Default Template',
        isDefault: true,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Default Template',
          content: '<p>Content</p>',
          isDefault: true,
        }),
      });

      await POST(request);

      expect(prisma.template.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('GET /api/templates/[id]', () => {
    it('should return a single template', async () => {
      const mockTemplate = {
        id: 'tpl-1',
        name: 'Test Template',
        content: '<p>Hello</p>',
        campaigns: [],
        _count: { campaigns: 3 },
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as never);

      const request = new NextRequest('http://localhost:3000/api/templates/tpl-1');
      const response = await GETById(request, { params: Promise.resolve({ id: 'tpl-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('tpl-1');
    });

    it('should return 404 for non-existent template', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/non-existent');
      const response = await GETById(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Template not found');
    });
  });

  describe('PUT /api/templates/[id]', () => {
    it('should update a template', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        id: 'tpl-1',
        name: 'Old Name',
      } as never);
      vi.mocked(prisma.template.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.template.update).mockResolvedValue({
        id: 'tpl-1',
        name: 'Updated Name',
      } as never);

      const request = new NextRequest('http://localhost:3000/api/templates/tpl-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'tpl-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Name');
    });

    it('should return 409 for duplicate name on update', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        id: 'tpl-1',
        name: 'Original',
      } as never);
      vi.mocked(prisma.template.findFirst).mockResolvedValue({
        id: 'tpl-other',
        name: 'Existing Name',
      } as never);

      const request = new NextRequest('http://localhost:3000/api/templates/tpl-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Existing Name' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'tpl-1' }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Template with this name already exists');
    });
  });

  describe('DELETE /api/templates/[id]', () => {
    it('should delete a template', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        id: 'tpl-1',
        _count: { campaigns: 0 },
      } as never);
      vi.mocked(prisma.template.delete).mockResolvedValue({} as never);

      const request = new NextRequest('http://localhost:3000/api/templates/tpl-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'tpl-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should not delete template used by campaigns', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        id: 'tpl-1',
        _count: { campaigns: 5 },
      } as never);

      const request = new NextRequest('http://localhost:3000/api/templates/tpl-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'tpl-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot delete template that is used by campaigns');
    });
  });

  describe('POST /api/templates/[id] (Duplicate)', () => {
    it('should duplicate a template', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        id: 'tpl-1',
        name: 'Original Template',
        subject: 'Subject',
        content: '<p>Content</p>',
        category: 'marketing',
      } as never);
      vi.mocked(prisma.template.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.template.create).mockResolvedValue({
        id: 'tpl-copy',
        name: 'Copy of Template',
        content: '<p>Content</p>',
        isDefault: false,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/templates/tpl-1', {
        method: 'POST',
        body: JSON.stringify({ name: 'Copy of Template' }),
      });

      const response = await DUPLICATE(request, { params: Promise.resolve({ id: 'tpl-1' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe('Copy of Template');
    });

    it('should return 404 when duplicating non-existent template', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/non-existent', {
        method: 'POST',
        body: JSON.stringify({ name: 'Copy' }),
      });

      const response = await DUPLICATE(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Template not found');
    });
  });
});
