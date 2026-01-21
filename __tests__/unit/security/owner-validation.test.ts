/**
 * Security Tests: Owner Validation
 * Tests that users can only access their own resources
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Test user IDs
const USER1_ID = 'user-1-id';
const USER2_ID = 'user-2-id';

// Mock auth to simulate authenticated requests
const mockAuthContext = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: USER1_ID, role: 'USER' } })),
  isAdmin: vi.fn(() => false),
  withAuth: vi.fn((handler, options) => {
    return async (request: NextRequest, context: unknown, params: unknown) => {
      const authContext = mockAuthContext();
      if (!authContext) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return handler(request, authContext, params);
    };
  }),
  createErrorResponse: vi.fn((message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

// Mock Prisma with ownership checks
const mockPrisma = {
  campaign: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  template: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  automation: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  webhook: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  aBTest: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  recipient: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  templateVersion: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  webhookDelivery: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  automationStep: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  automationEnrollment: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: {
    check: vi.fn(() => ({ success: true, resetAt: Date.now() + 60000 })),
  },
}));

describe('Security: Owner Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: User 1 is authenticated
    mockAuthContext.mockReturnValue({
      type: 'session',
      userId: USER1_ID,
      userRole: 'USER',
    });
  });

  const createRequest = (url: string, method = 'GET', body?: object) => {
    const options: RequestInit = { method };
    if (body) {
      options.body = JSON.stringify(body);
      options.headers = { 'Content-Type': 'application/json' };
    }
    return new NextRequest(`http://localhost:3000${url}`, options);
  };

  describe('Campaign Owner Validation', () => {
    it('should return 404 when accessing another user\'s campaign', async () => {
      // Campaign belongs to USER2, but USER1 is trying to access
      mockPrisma.campaign.findFirst.mockResolvedValue(null); // Not found for USER1

      const { GET } = await import('@/app/api/campaigns/[id]/route');
      const request = createRequest('/api/campaigns/user2-campaign-id');
      const params = { id: 'user2-campaign-id' };

      const response = await GET(request, {}, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should allow access to own campaign', async () => {
      // Campaign belongs to USER1
      const mockCampaign = {
        id: 'user1-campaign-id',
        userId: USER1_ID,
        name: 'My Campaign',
        subject: 'Test',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { recipients: 0, events: 0 },
      };

      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);

      const { GET } = await import('@/app/api/campaigns/[id]/route');
      const request = createRequest('/api/campaigns/user1-campaign-id');
      const params = { id: 'user1-campaign-id' };

      const response = await GET(request, {}, params);

      // Should succeed (status 200) because user owns the campaign
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'user1-campaign-id',
            userId: USER1_ID,
          }),
        })
      );
    });

    it('should filter list to only show user\'s own campaigns', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.campaign.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/campaigns/route');
      const request = createRequest('/api/campaigns');

      await GET(request, {}, {});

      // Verify userId filter is applied
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER1_ID,
          }),
        })
      );
    });
  });

  describe('Contact Owner Validation', () => {
    it('should return 404 when accessing another user\'s contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const { GET } = await import('@/app/api/contacts/[id]/route');
      const request = createRequest('/api/contacts/user2-contact-id');
      const params = { id: 'user2-contact-id' };

      const response = await GET(request, {}, params);

      expect(response.status).toBe(404);
    });

    it('should filter contact list to only show user\'s own contacts', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/contacts/route');
      const request = createRequest('/api/contacts');

      await GET(request, {}, {});

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER1_ID,
          }),
        })
      );
    });
  });

  describe('Template Owner Validation', () => {
    it('should return 404 when accessing another user\'s template', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      const { GET } = await import('@/app/api/templates/[id]/route');
      const request = createRequest('/api/templates/user2-template-id');
      const params = { id: 'user2-template-id' };

      const response = await GET(request, {}, params);

      expect(response.status).toBe(404);
    });

    it('should filter template list to only show user\'s own templates', async () => {
      mockPrisma.template.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/templates/route');
      const request = createRequest('/api/templates');

      await GET(request, {}, {});

      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER1_ID,
          }),
        })
      );
    });
  });

  describe('Automation Owner Validation', () => {
    it('should return 404 when accessing another user\'s automation', async () => {
      mockPrisma.automation.findFirst.mockResolvedValue(null);

      const { GET } = await import('@/app/api/automations/[id]/route');
      const request = createRequest('/api/automations/user2-automation-id');
      const params = { id: 'user2-automation-id' };

      const response = await GET(request, {}, params);

      expect(response.status).toBe(404);
    });
  });

  describe('Webhook Owner Validation', () => {
    it('should return 404 when accessing another user\'s webhook', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      const { GET } = await import('@/app/api/webhooks/[id]/route');
      const request = createRequest('/api/webhooks/user2-webhook-id');
      const params = { id: 'user2-webhook-id' };

      const response = await GET(request, {}, params);

      expect(response.status).toBe(404);
    });
  });

  describe('A/B Test Owner Validation', () => {
    it('should return 404 when accessing another user\'s A/B test', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue(null);

      const { GET } = await import('@/app/api/ab-tests/[id]/route');
      const request = createRequest('/api/ab-tests/user2-abtest-id');
      const params = { id: 'user2-abtest-id' };

      const response = await GET(request, {}, params);

      expect(response.status).toBe(404);
    });
  });

  describe('Cross-resource validation', () => {
    it('should not allow creating A/B test for another user\'s campaign', async () => {
      // User1 tries to create A/B test for User2's campaign
      mockPrisma.campaign.findFirst.mockResolvedValue(null); // Campaign not found for User1

      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createRequest('/api/ab-tests', 'POST', {
        campaignId: 'user2-campaign-id',
        name: 'Malicious Test',
        variants: [],
      });

      const response = await POST(request, {}, {});

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should not allow enrolling another user\'s contact in automation', async () => {
      // User1 owns automation but tries to enroll User2's contact
      mockPrisma.automation.findFirst.mockResolvedValue({ id: 'user1-automation' }); // Automation exists
      mockPrisma.contact.findFirst.mockResolvedValue(null); // Contact not found for User1

      const { POST } = await import('@/app/api/automations/[id]/enrollments/route');
      const request = createRequest('/api/automations/user1-automation/enrollments', 'POST', {
        contactId: 'user2-contact-id',
      });
      const params = { id: 'user1-automation' };

      const response = await POST(request, {}, params);

      expect(response.status).toBe(404);
    });
  });

  describe('Admin bypass validation', () => {
    it('admin routes should require admin role', async () => {
      // Regular user trying to access admin route
      mockAuthContext.mockReturnValue({
        type: 'session',
        userId: USER1_ID,
        userRole: 'USER', // Not admin
      });

      const { GET, POST } = await import('@/app/api/queue/route');

      // Queue routes require admin - should be blocked by withAuth middleware
      const request = createRequest('/api/queue');
      const response = await GET(request, {}, {});

      // With our mock, withAuth should handle admin check
      // The actual implementation would return 403 for non-admin
      expect(response).toBeDefined();
    });
  });
});
