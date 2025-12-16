import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as ListVersions } from '@/app/api/templates/[id]/versions/route';
import { GET as GetVersion } from '@/app/api/templates/[id]/versions/[version]/route';
import { POST as RevertVersion } from '@/app/api/templates/[id]/versions/[version]/revert/route';
import { GET as CompareVersions } from '@/app/api/templates/[id]/versions/compare/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    template: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    templateVersion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: {
    check: vi.fn(() => ({ success: true, resetAt: Date.now() + 60000 })),
  },
}));

import { prisma } from '@/lib/db/prisma';

describe('Template Versions API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/templates/[id]/versions', () => {
    it('should return versions list with pagination', async () => {
      const mockTemplate = { id: 'template-1', currentVersion: 3 };
      const mockVersions = [
        {
          id: 'v3',
          version: 3,
          name: 'Test',
          changeType: 'UPDATE',
          changeSummary: 'Updated content',
          createdBy: 'user-1',
          createdAt: new Date(),
        },
        {
          id: 'v2',
          version: 2,
          name: 'Test',
          changeType: 'UPDATE',
          changeSummary: 'Updated subject',
          createdBy: 'user-1',
          createdAt: new Date(),
        },
        {
          id: 'v1',
          version: 1,
          name: 'Test',
          changeType: 'CREATE',
          changeSummary: 'Initial version',
          createdBy: 'user-1',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as never);
      vi.mocked(prisma.templateVersion.findMany).mockResolvedValue(mockVersions as never);
      vi.mocked(prisma.templateVersion.count).mockResolvedValue(3);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions');
      const response = await ListVersions(request, { params: Promise.resolve({ id: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(3);
      expect(data.currentVersion).toBe(3);
      expect(data.pagination.total).toBe(3);
    });

    it('should return 404 if template not found', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/nonexistent/versions');
      const response = await ListVersions(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('should support pagination parameters', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({ id: 'template-1', currentVersion: 10 } as never);
      vi.mocked(prisma.templateVersion.findMany).mockResolvedValue([]);
      vi.mocked(prisma.templateVersion.count).mockResolvedValue(50);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions?page=2&limit=10');
      const response = await ListVersions(request, { params: Promise.resolve({ id: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(5);
    });
  });

  describe('GET /api/templates/[id]/versions/[version]', () => {
    it('should return version details', async () => {
      const mockTemplate = { id: 'template-1' };
      const mockVersion = {
        id: 'v2',
        templateId: 'template-1',
        version: 2,
        name: 'Test Template',
        subject: 'Test Subject',
        content: '<p>Test content</p>',
        category: 'newsletter',
        changeType: 'UPDATE',
        changeSummary: 'Updated content',
        createdBy: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as never);
      vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue(mockVersion as never);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/2');
      const response = await GetVersion(request, { params: Promise.resolve({ id: 'template-1', version: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.version).toBe(2);
      expect(data.data.name).toBe('Test Template');
      expect(data.data.content).toBe('<p>Test content</p>');
    });

    it('should return 404 if template not found', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/nonexistent/versions/1');
      const response = await GetVersion(request, { params: Promise.resolve({ id: 'nonexistent', version: '1' }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 if version not found', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({ id: 'template-1' } as never);
      vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/99');
      const response = await GetVersion(request, { params: Promise.resolve({ id: 'template-1', version: '99' }) });

      expect(response.status).toBe(404);
    });

    it('should validate version number', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/0');
      const response = await GetVersion(request, { params: Promise.resolve({ id: 'template-1', version: '0' }) });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/templates/[id]/versions/[version]/revert', () => {
    it('should revert to a previous version', async () => {
      const mockTemplate = { id: 'template-1', currentVersion: 3, userId: 'user-1' };
      const mockTargetVersion = {
        id: 'v1',
        templateId: 'template-1',
        version: 1,
        name: 'Original Name',
        subject: 'Original Subject',
        content: '<p>Original</p>',
        category: 'newsletter',
        thumbnail: null,
      };
      const mockNewVersion = {
        id: 'v4',
        version: 4,
        changeType: 'REVERT',
        changeSummary: 'Reverted to version 1',
        createdAt: new Date(),
      };
      const mockUpdatedTemplate = {
        id: 'template-1',
        name: 'Original Name',
        currentVersion: 4,
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as never);
      vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue(mockTargetVersion as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([mockNewVersion, mockUpdatedTemplate] as never);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/1/revert', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await RevertVersion(request, { params: Promise.resolve({ id: 'template-1', version: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Successfully reverted to version 1');
      expect(data.data.newVersion.version).toBe(4);
      expect(data.data.newVersion.changeType).toBe('REVERT');
    });

    it('should return 404 if template not found', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/nonexistent/versions/1/revert', {
        method: 'POST',
      });
      const response = await RevertVersion(request, { params: Promise.resolve({ id: 'nonexistent', version: '1' }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 if target version not found', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({ id: 'template-1', currentVersion: 3, userId: null } as never);
      vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/99/revert', {
        method: 'POST',
      });
      const response = await RevertVersion(request, { params: Promise.resolve({ id: 'template-1', version: '99' }) });

      expect(response.status).toBe(404);
    });

    it('should return 400 if trying to revert to current version', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({ id: 'template-1', currentVersion: 3, userId: null } as never);
      vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue({ version: 3 } as never);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/3/revert', {
        method: 'POST',
      });
      const response = await RevertVersion(request, { params: Promise.resolve({ id: 'template-1', version: '3' }) });

      expect(response.status).toBe(400);
    });

    it('should accept custom change summary', async () => {
      const mockTemplate = { id: 'template-1', currentVersion: 3, userId: 'user-1' };
      const mockTargetVersion = {
        id: 'v1',
        templateId: 'template-1',
        version: 1,
        name: 'Original',
        subject: null,
        content: '<p>Original</p>',
        category: null,
        thumbnail: null,
      };
      const mockNewVersion = {
        id: 'v4',
        version: 4,
        changeType: 'REVERT',
        changeSummary: 'Reverted to version 1: Fix bug in template',
        createdAt: new Date(),
      };
      const mockUpdatedTemplate = {
        id: 'template-1',
        name: 'Original',
        currentVersion: 4,
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as never);
      vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue(mockTargetVersion as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([mockNewVersion, mockUpdatedTemplate] as never);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/1/revert', {
        method: 'POST',
        body: JSON.stringify({ changeSummary: 'Fix bug in template' }),
      });
      const response = await RevertVersion(request, { params: Promise.resolve({ id: 'template-1', version: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.newVersion.changeSummary).toContain('Fix bug in template');
    });
  });

  describe('GET /api/templates/[id]/versions/compare', () => {
    it('should compare two versions', async () => {
      const mockTemplate = { id: 'template-1' };
      const mockVersion1 = {
        version: 1,
        name: 'Original Name',
        subject: 'Original Subject',
        content: '<p>Original content</p>',
        category: 'newsletter',
        createdAt: new Date('2024-01-01'),
      };
      const mockVersion2 = {
        version: 3,
        name: 'Original Name',
        subject: 'Updated Subject',
        content: '<p>Updated content</p>',
        category: 'newsletter',
        createdAt: new Date('2024-01-15'),
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as never);
      vi.mocked(prisma.templateVersion.findUnique)
        .mockResolvedValueOnce(mockVersion1 as never)
        .mockResolvedValueOnce(mockVersion2 as never);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/compare?v1=1&v2=3');
      const response = await CompareVersions(request, { params: Promise.resolve({ id: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.version1.version).toBe(1);
      expect(data.data.version2.version).toBe(3);
      expect(data.data.changes.name).toBe(false);
      expect(data.data.changes.subject).toBe(true);
      expect(data.data.changes.content).toBe(true);
      expect(data.data.changes.category).toBe(false);
    });

    it('should return 404 if template not found', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/nonexistent/versions/compare?v1=1&v2=2');
      const response = await CompareVersions(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('should return 400 if v1 is missing', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({ id: 'template-1' } as never);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/compare?v2=2');
      const response = await CompareVersions(request, { params: Promise.resolve({ id: 'template-1' }) });

      expect(response.status).toBe(400);
    });

    it('should return 400 if v2 is missing', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({ id: 'template-1' } as never);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/compare?v1=1');
      const response = await CompareVersions(request, { params: Promise.resolve({ id: 'template-1' }) });

      expect(response.status).toBe(400);
    });

    it('should return 404 if one version not found', async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({ id: 'template-1' } as never);
      vi.mocked(prisma.templateVersion.findUnique)
        .mockResolvedValueOnce({ version: 1 } as never)
        .mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/templates/template-1/versions/compare?v1=1&v2=99');
      const response = await CompareVersions(request, { params: Promise.resolve({ id: 'template-1' }) });

      expect(response.status).toBe(404);
    });
  });
});
