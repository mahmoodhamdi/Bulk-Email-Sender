import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to define mocks that will be available when vi.mock runs
const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      recipient: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      emailEvent: {
        create: vi.fn(),
      },
      campaign: {
        update: vi.fn(),
      },
      contact: {
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      unsubscribe: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock webhook fireEvent
vi.mock('@/lib/webhook', () => ({
  fireEvent: vi.fn().mockResolvedValue({ queued: 1, webhookIds: ['webhook-1'] }),
  WEBHOOK_EVENTS: {
    EMAIL_OPENED: 'email.opened',
    EMAIL_CLICKED: 'email.clicked',
    EMAIL_UNSUBSCRIBED: 'email.unsubscribed',
    EMAIL_DELIVERED: 'email.delivered',
    EMAIL_BOUNCED: 'email.bounced',
    EMAIL_COMPLAINED: 'email.complained',
  },
}));

// Import routes after mocking
import { GET as openRoute } from '@/app/api/tracking/open/route';
import { GET as clickRoute } from '@/app/api/tracking/click/route';
import { GET as unsubscribeGetRoute, POST as unsubscribePostRoute } from '@/app/api/tracking/unsubscribe/route';
import { POST as webhookRoute } from '@/app/api/tracking/webhook/route';

describe('Tracking API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tracking/open', () => {
    it('should return tracking pixel for valid tracking ID', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        openCount: 0,
        openedAt: null,
        status: 'SENT',
        contact: { id: 'contact-1', firstName: 'John', lastName: 'Doe', company: 'Test Co' },
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findUnique.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({ ...recipient, openCount: 1 });
      mockPrisma.emailEvent.create.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/open?id=valid-tracking-id');
      const response = await openRoute(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
      expect(response.headers.get('Cache-Control')).toContain('no-store');
    });

    it('should still return tracking pixel for invalid tracking ID', async () => {
      mockPrisma.recipient.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/tracking/open?id=invalid-id');
      const response = await openRoute(request);

      // Should still return pixel to avoid breaking email rendering
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
    });

    it('should track first open and update campaign count', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        openCount: 0,
        openedAt: null, // First open
        status: 'SENT',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findUnique.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/open?id=first-open-id');
      await openRoute(request);

      // Should update campaign opened count
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { openedCount: { increment: 1 } },
      });
    });

    it('should not update campaign count on subsequent opens', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        openCount: 2,
        openedAt: new Date(), // Already opened before
        status: 'OPENED',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findUnique.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/open?id=subsequent-open-id');
      await openRoute(request);

      // Should NOT update campaign opened count
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/tracking/click', () => {
    it('should redirect to destination URL for valid tracking', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        clickCount: 0,
        clickedAt: null,
        status: 'OPENED',
        contact: { id: 'contact-1', firstName: 'John', lastName: 'Doe', company: 'Test Co' },
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findUnique.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});

      const destUrl = encodeURIComponent('https://example.com/destination');
      const request = new NextRequest(`http://localhost:3000/api/tracking/click?id=valid-id&url=${destUrl}`);
      const response = await clickRoute(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('https://example.com/destination');
    });

    it('should track click with link ID', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        clickCount: 0,
        clickedAt: null,
        status: 'OPENED',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findUnique.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});

      const destUrl = encodeURIComponent('https://example.com');
      const request = new NextRequest(`http://localhost:3000/api/tracking/click?id=valid-id&url=${destUrl}&linkId=cta-button`);
      await clickRoute(request);

      expect(mockPrisma.emailEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            linkId: 'cta-button',
          }),
        }),
      });
    });

    it('should return error for invalid URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/tracking/click?id=valid-id&url=invalid-url');
      const response = await clickRoute(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should update campaign clicked count on first click', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        clickCount: 0,
        clickedAt: null, // First click
        status: 'OPENED',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findUnique.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});

      const destUrl = encodeURIComponent('https://example.com');
      const request = new NextRequest(`http://localhost:3000/api/tracking/click?id=first-click&url=${destUrl}`);
      await clickRoute(request);

      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { clickedCount: { increment: 1 } },
      });
    });
  });

  describe('GET /api/tracking/unsubscribe', () => {
    it('should process unsubscribe for valid token', async () => {
      const unsubscribeRecord = {
        id: 'unsub-1',
        token: 'valid-token-123',
        email: 'test@example.com',
        campaignId: 'campaign-1',
      };

      const contact = {
        id: 'contact-1',
        email: 'test@example.com',
        status: 'ACTIVE',
      };

      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        status: 'DELIVERED',
      };

      mockPrisma.unsubscribe.findUnique.mockResolvedValue(unsubscribeRecord);
      mockPrisma.contact.findFirst.mockResolvedValue(contact);
      mockPrisma.contact.update.mockResolvedValue({});
      mockPrisma.recipient.findFirst.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/unsubscribe?token=valid-token-123');
      const response = await unsubscribeGetRoute(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.email).toBe('test@example.com');
    });

    it('should return 404 for invalid token', async () => {
      mockPrisma.unsubscribe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/tracking/unsubscribe?token=invalid-token');
      const response = await unsubscribeGetRoute(request);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/tracking/unsubscribe', () => {
    it('should process unsubscribe request with reason', async () => {
      const unsubscribeRecord = {
        id: 'unsub-1',
        token: 'valid-token-123',
        email: 'test@example.com',
        campaignId: 'campaign-1',
      };

      const contact = {
        id: 'contact-1',
        email: 'test@example.com',
        status: 'ACTIVE',
      };

      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        status: 'DELIVERED',
      };

      mockPrisma.unsubscribe.findUnique.mockResolvedValue(unsubscribeRecord);
      mockPrisma.unsubscribe.update.mockResolvedValue({});
      mockPrisma.contact.findFirst.mockResolvedValue(contact);
      mockPrisma.contact.update.mockResolvedValue({});
      mockPrisma.recipient.findFirst.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token-123',
          reason: 'no_longer_interested',
        }),
      });

      const response = await unsubscribePostRoute(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 404 for invalid token in POST', async () => {
      mockPrisma.unsubscribe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/tracking/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' }),
      });

      const response = await unsubscribePostRoute(request);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/tracking/webhook', () => {
    it('should process DELIVERED event', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        status: 'SENT',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findFirst.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DELIVERED',
          email: 'test@example.com',
          campaignId: 'campaign-1',
        }),
      });

      const response = await webhookRoute(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.processed).toBe(1);
    });

    it('should process BOUNCED event', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'bounced@example.com',
        campaignId: 'campaign-1',
        status: 'SENT',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findFirst.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.contact.updateMany.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'BOUNCED',
          email: 'bounced@example.com',
          campaignId: 'campaign-1',
          metadata: { type: 'hard', reason: 'Invalid mailbox' },
        }),
      });

      const response = await webhookRoute(request);

      expect(response.status).toBe(200);
    });

    it('should process batch events', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'test@example.com',
        campaignId: 'campaign-1',
        status: 'SENT',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findFirst.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.campaign.update.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { type: 'DELIVERED', email: 'test1@example.com', campaignId: 'campaign-1' },
          { type: 'DELIVERED', email: 'test2@example.com', campaignId: 'campaign-1' },
        ]),
      });

      const response = await webhookRoute(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processed).toBe(2);
    });

    it('should return error for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/tracking/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });

      const response = await webhookRoute(request);

      expect(response.status).toBe(400);
    });

    it('should process UNSUBSCRIBED event', async () => {
      const recipient = {
        id: 'recipient-1',
        email: 'unsub@example.com',
        campaignId: 'campaign-1',
        status: 'DELIVERED',
        contact: null,
        campaign: { name: 'Test Campaign', userId: 'user-1' },
      };

      mockPrisma.recipient.findFirst.mockResolvedValue(recipient);
      mockPrisma.recipient.update.mockResolvedValue({});
      mockPrisma.contact.updateMany.mockResolvedValue({});
      mockPrisma.emailEvent.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/tracking/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UNSUBSCRIBED',
          email: 'unsub@example.com',
          campaignId: 'campaign-1',
        }),
      });

      const response = await webhookRoute(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
        where: { email: 'unsub@example.com' },
        data: expect.objectContaining({ status: 'UNSUBSCRIBED' }),
      });
    });
  });
});
