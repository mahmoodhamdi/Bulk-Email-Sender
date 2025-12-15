import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/campaigns/route';
import { GET as GETById, PUT, DELETE } from '@/app/api/campaigns/[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

describe('Campaigns API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/campaigns', () => {
    it('should return campaigns list with pagination', async () => {
      const mockCampaigns = [
        {
          id: 'camp-1',
          name: 'Test Campaign',
          subject: 'Test Subject',
          status: 'DRAFT',
          createdAt: new Date(),
          _count: { recipients: 10, events: 5 },
        },
      ];

      vi.mocked(prisma.campaign.count).mockResolvedValue(1);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue(mockCampaigns as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it('should filter campaigns by status', async () => {
      vi.mocked(prisma.campaign.count).mockResolvedValue(0);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/campaigns?status=DRAFT');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DRAFT' }),
        })
      );
    });

    it('should handle search parameter', async () => {
      vi.mocked(prisma.campaign.count).mockResolvedValue(0);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/campaigns?search=newsletter');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'newsletter' }) }),
            ]),
          }),
        })
      );
    });
  });

  describe('POST /api/campaigns', () => {
    it('should create a new campaign', async () => {
      const newCampaign = {
        id: 'camp-new',
        name: 'New Campaign',
        subject: 'New Subject',
        fromName: 'Test',
        fromEmail: 'test@example.com',
        content: '<p>Hello</p>',
        contentType: 'html',
        status: 'DRAFT',
        createdAt: new Date(),
      };

      vi.mocked(prisma.campaign.create).mockResolvedValue(newCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Campaign',
          subject: 'New Subject',
          fromName: 'Test',
          fromEmail: 'test@example.com',
          content: '<p>Hello</p>',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe('New Campaign');
    });

    it('should return validation error for invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // Empty name should fail
          subject: 'Test',
          fromName: 'Test',
          fromEmail: 'invalid-email', // Invalid email
          content: '<p>Hello</p>',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('GET /api/campaigns/[id]', () => {
    it('should return a single campaign', async () => {
      const mockCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        name: 'Test Campaign',
        subject: 'Test Subject',
        status: 'DRAFT',
        template: { id: 'tpl-1', name: 'Template', content: '<p>Content</p>' },
        recipients: [],
        _count: { recipients: 10, events: 5 },
      };

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx');
      const response = await GETById(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('clxxxxxxxxxxxxxxxxxx');
    });

    it('should return 404 for non-existent campaign', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clyyyyyyyyyyyyyyyy');
      const response = await GETById(request, { params: Promise.resolve({ id: 'clyyyyyyyyyyyyyyyy' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Campaign not found');
    });
  });

  describe('PUT /api/campaigns/[id]', () => {
    it('should update a campaign', async () => {
      const existingCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'DRAFT',
      };

      const updatedCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        name: 'Updated Campaign',
        status: 'DRAFT',
      };

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(existingCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(updatedCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Campaign' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Campaign');
    });

    it('should return 404 for non-existent campaign on update', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Campaign not found');
    });
  });

  describe('DELETE /api/campaigns/[id]', () => {
    it('should delete a campaign', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'DRAFT',
      } as never);
      vi.mocked(prisma.campaign.delete).mockResolvedValue({} as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent campaign on delete', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Campaign not found');
    });
  });
});
