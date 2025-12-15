import { describe, it, expect } from 'vitest';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdSchema,
  listCampaignsSchema,
  addRecipientsSchema,
  CampaignStatusEnum,
} from '@/lib/validations/campaign';

describe('Campaign Validation Schemas', () => {
  describe('CampaignStatusEnum', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['DRAFT', 'SCHEDULED', 'SENDING', 'PAUSED', 'COMPLETED', 'CANCELLED'];
      validStatuses.forEach((status) => {
        expect(() => CampaignStatusEnum.parse(status)).not.toThrow();
      });
    });

    it('should reject invalid status values', () => {
      expect(() => CampaignStatusEnum.parse('INVALID')).toThrow();
      expect(() => CampaignStatusEnum.parse('draft')).toThrow();
      expect(() => CampaignStatusEnum.parse('')).toThrow();
    });
  });

  describe('createCampaignSchema', () => {
    const validCampaign = {
      name: 'Test Campaign',
      subject: 'Test Subject',
      fromName: 'Test Sender',
      fromEmail: 'test@example.com',
      content: '<p>Hello World</p>',
    };

    it('should accept valid campaign data', () => {
      const result = createCampaignSchema.parse(validCampaign);
      expect(result.name).toBe('Test Campaign');
      expect(result.contentType).toBe('html');
    });

    it('should reject empty name', () => {
      expect(() => createCampaignSchema.parse({ ...validCampaign, name: '' })).toThrow();
    });

    it('should reject name over 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => createCampaignSchema.parse({ ...validCampaign, name: longName })).toThrow();
    });

    it('should reject invalid fromEmail', () => {
      expect(() => createCampaignSchema.parse({ ...validCampaign, fromEmail: 'invalid' })).toThrow();
    });

    it('should accept null replyTo', () => {
      const result = createCampaignSchema.parse({ ...validCampaign, replyTo: null });
      expect(result.replyTo).toBeNull();
    });

    it('should reject empty content', () => {
      expect(() => createCampaignSchema.parse({ ...validCampaign, content: '' })).toThrow();
    });
  });

  describe('updateCampaignSchema', () => {
    it('should accept partial updates', () => {
      const result = updateCampaignSchema.parse({ name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('should accept empty object', () => {
      const result = updateCampaignSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept status update', () => {
      const result = updateCampaignSchema.parse({ status: 'PAUSED' });
      expect(result.status).toBe('PAUSED');
    });
  });

  describe('campaignIdSchema', () => {
    it('should accept valid CUID', () => {
      const result = campaignIdSchema.parse({ id: 'clxxxxxxxxxxxxxxxxxx' });
      expect(result.id).toBe('clxxxxxxxxxxxxxxxxxx');
    });

    it('should reject invalid CUID format', () => {
      expect(() => campaignIdSchema.parse({ id: '' })).toThrow();
    });
  });

  describe('listCampaignsSchema', () => {
    it('should use defaults for empty object', () => {
      const result = listCampaignsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should coerce string numbers', () => {
      const result = listCampaignsSchema.parse({ page: '5', limit: '25' });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(25);
    });

    it('should reject limit over 100', () => {
      expect(() => listCampaignsSchema.parse({ limit: '101' })).toThrow();
    });
  });

  describe('addRecipientsSchema', () => {
    it('should accept valid email array', () => {
      const result = addRecipientsSchema.parse({
        emails: ['test1@example.com', 'test2@example.com'],
      });
      expect(result.emails).toHaveLength(2);
    });

    it('should reject empty emails array', () => {
      expect(() => addRecipientsSchema.parse({ emails: [] })).toThrow();
    });
  });
});
