/**
 * Automation Module Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAutomationSchema,
  updateAutomationSchema,
  createStepSchema,
  updateStepSchema,
  enrollContactSchema,
  emailStepConfigSchema,
  delayStepConfigSchema,
  conditionStepConfigSchema,
  actionStepConfigSchema,
  webhookStepConfigSchema,
} from '@/lib/automation/types';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    automation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    automationStep: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    automationEnrollment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    automationStepExecution: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Automation Types and Schemas', () => {
  describe('createAutomationSchema', () => {
    it('should validate valid automation input', () => {
      const validInput = {
        name: 'Welcome Series',
        description: 'Onboarding automation for new users',
        triggerType: 'SIGNUP',
        triggerConfig: { listIds: ['list-1'] },
      };

      const result = createAutomationSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidInput = {
        name: '',
        triggerType: 'SIGNUP',
      };

      const result = createAutomationSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid trigger type', () => {
      const invalidInput = {
        name: 'Test',
        triggerType: 'INVALID_TRIGGER',
      };

      const result = createAutomationSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should allow all valid trigger types', () => {
      const triggerTypes = ['SIGNUP', 'TAG_ADDED', 'DATE_FIELD', 'MANUAL', 'EMAIL_OPENED', 'LINK_CLICKED', 'FORM_SUBMITTED'];

      triggerTypes.forEach((triggerType) => {
        const input = { name: 'Test', triggerType };
        const result = createAutomationSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should validate with steps', () => {
      const input = {
        name: 'With Steps',
        triggerType: 'MANUAL',
        steps: [
          {
            stepType: 'EMAIL',
            name: 'Welcome Email',
            config: { subject: 'Welcome!' },
          },
        ],
      };

      const result = createAutomationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('updateAutomationSchema', () => {
    it('should validate partial update', () => {
      const input = { name: 'Updated Name' };
      const result = updateAutomationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate empty update', () => {
      const result = updateAutomationSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('createStepSchema', () => {
    it('should validate valid step input', () => {
      const validInput = {
        stepType: 'EMAIL',
        name: 'Welcome Email',
        config: { subject: 'Hello!', content: '<p>Welcome!</p>' },
      };

      const result = createStepSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate delay step', () => {
      const input = {
        stepType: 'DELAY',
        name: 'Wait 1 Day',
        config: { duration: 1, unit: 'days' },
      };

      const result = createStepSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate condition step', () => {
      const input = {
        stepType: 'CONDITION',
        name: 'Check Status',
        config: { field: 'status', operator: 'equals', value: 'active' },
        trueStepId: 'step-1',
        falseStepId: 'step-2',
      };

      const result = createStepSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate webhook step', () => {
      const input = {
        stepType: 'WEBHOOK',
        name: 'Notify CRM',
        config: { url: 'https://api.example.com/webhook', method: 'POST' },
      };

      const result = createStepSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid step type', () => {
      const input = {
        stepType: 'INVALID',
        name: 'Test',
        config: {},
      };

      const result = createStepSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateStepSchema', () => {
    it('should allow partial step updates', () => {
      const input = { name: 'Updated Step Name' };
      const result = updateStepSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow null for connection fields', () => {
      const input = { nextStepId: null, trueStepId: null };
      const result = updateStepSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate position updates', () => {
      const input = { positionX: 100, positionY: 200 };
      const result = updateStepSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('enrollContactSchema', () => {
    it('should validate valid enrollment input', () => {
      const input = { contactId: 'contact-123' };
      const result = enrollContactSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with optional start step', () => {
      const input = { contactId: 'contact-123', startStepId: 'step-456' };
      const result = enrollContactSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty contact ID', () => {
      const input = { contactId: '' };
      const result = enrollContactSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Step Config Schemas', () => {
  describe('emailStepConfigSchema', () => {
    it('should validate valid email config', () => {
      const config = {
        subject: 'Welcome to our platform!',
        content: '<h1>Hello</h1><p>Welcome!</p>',
        fromName: 'John Doe',
        fromEmail: 'john@example.com',
      };

      const result = emailStepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should require subject and content', () => {
      const result = emailStepConfigSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('delayStepConfigSchema', () => {
    it('should validate valid delay config', () => {
      const config = { duration: 24, unit: 'hours' };
      const result = delayStepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should allow all valid units', () => {
      const units = ['minutes', 'hours', 'days', 'weeks'];
      units.forEach((unit) => {
        const result = delayStepConfigSchema.safeParse({ duration: 1, unit });
        expect(result.success).toBe(true);
      });
    });

    it('should reject duration less than 1', () => {
      const result = delayStepConfigSchema.safeParse({ duration: 0, unit: 'hours' });
      expect(result.success).toBe(false);
    });
  });

  describe('conditionStepConfigSchema', () => {
    it('should validate valid condition config', () => {
      const config = {
        field: 'email',
        operator: 'contains',
        value: '@example.com',
      };

      const result = conditionStepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should allow all valid operators', () => {
      const operators = ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];
      operators.forEach((operator) => {
        const result = conditionStepConfigSchema.safeParse({
          field: 'status',
          operator,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('actionStepConfigSchema', () => {
    it('should validate add_tag action', () => {
      const config = { actionType: 'add_tag', tag: 'premium' };
      const result = actionStepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate update_field action', () => {
      const config = {
        actionType: 'update_field',
        field: 'status',
        fieldValue: 'active',
      };
      const result = actionStepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate subscribe_list action', () => {
      const config = { actionType: 'subscribe_list', listId: 'list-123' };
      const result = actionStepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('webhookStepConfigSchema', () => {
    it('should validate valid webhook config', () => {
      const config = {
        url: 'https://api.example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"event": "signup"}',
      };

      const result = webhookStepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = webhookStepConfigSchema.safeParse({
        url: 'not-a-url',
        method: 'POST',
      });
      expect(result.success).toBe(false);
    });

    it('should default method to POST', () => {
      const result = webhookStepConfigSchema.safeParse({
        url: 'https://api.example.com/webhook',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe('POST');
      }
    });
  });
});

describe('Automation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAutomation', () => {
    it('should create automation with valid input', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { createAutomation } = await import('@/lib/automation');

      const mockAutomation = {
        id: 'automation-1',
        name: 'Test Automation',
        description: 'Test description',
        triggerType: 'SIGNUP',
        triggerConfig: {},
        status: 'DRAFT',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [],
      };

      vi.mocked(prisma.automation.create).mockResolvedValue(mockAutomation);

      const result = await createAutomation(
        {
          name: 'Test Automation',
          description: 'Test description',
          triggerType: 'SIGNUP',
        },
        'user-1'
      );

      expect(result).toEqual(mockAutomation);
      expect(prisma.automation.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAutomation', () => {
    it('should return automation with stats', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { getAutomation } = await import('@/lib/automation');

      const mockAutomation = {
        id: 'automation-1',
        name: 'Test',
        description: null,
        triggerType: 'SIGNUP',
        triggerConfig: {},
        status: 'ACTIVE',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            id: 'step-1',
            automationId: 'automation-1',
            stepType: 'EMAIL',
            name: 'Welcome',
            config: {},
            nextStepId: null,
            trueStepId: null,
            falseStepId: null,
            positionX: 0,
            positionY: 0,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        enrollments: [
          { id: 'e1', status: 'ACTIVE' },
          { id: 'e2', status: 'COMPLETED' },
          { id: 'e3', status: 'EXITED' },
        ],
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);

      const result = await getAutomation('automation-1');

      expect(result).not.toBeNull();
      expect(result?.stats.totalEnrollments).toBe(3);
      expect(result?.stats.activeEnrollments).toBe(1);
      expect(result?.stats.completedEnrollments).toBe(1);
      expect(result?.stats.exitedEnrollments).toBe(1);
    });

    it('should return null for non-existent automation', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { getAutomation } = await import('@/lib/automation');

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      const result = await getAutomation('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('activateAutomation', () => {
    it('should activate draft automation with steps', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { activateAutomation } = await import('@/lib/automation');

      const mockAutomation = {
        id: 'automation-1',
        status: 'DRAFT',
        steps: [{ id: 'step-1' }],
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);
      vi.mocked(prisma.automation.update).mockResolvedValue({
        ...mockAutomation,
        status: 'ACTIVE',
      } as never);

      const result = await activateAutomation('automation-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error for automation without steps', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { activateAutomation } = await import('@/lib/automation');

      const mockAutomation = {
        id: 'automation-1',
        status: 'DRAFT',
        steps: [],
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);

      await expect(activateAutomation('automation-1')).rejects.toThrow(
        'Automation must have at least one step'
      );
    });

    it('should throw error if already active', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { activateAutomation } = await import('@/lib/automation');

      const mockAutomation = {
        id: 'automation-1',
        status: 'ACTIVE',
        steps: [{ id: 'step-1' }],
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);

      await expect(activateAutomation('automation-1')).rejects.toThrow(
        'Automation is already active'
      );
    });
  });

  describe('enrollContact', () => {
    it('should enroll contact in active automation', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { enrollContact } = await import('@/lib/automation');

      const mockAutomation = {
        id: 'automation-1',
        status: 'ACTIVE',
        steps: [{ id: 'step-1', sortOrder: 0 }],
      };

      const mockEnrollment = {
        id: 'enrollment-1',
        automationId: 'automation-1',
        contactId: 'contact-1',
        status: 'ACTIVE',
        currentStepId: 'step-1',
        startedAt: new Date(),
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.automationEnrollment.upsert).mockResolvedValue(mockEnrollment as never);

      const result = await enrollContact('automation-1', 'contact-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error for inactive automation', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      const { enrollContact } = await import('@/lib/automation');

      const mockAutomation = {
        id: 'automation-1',
        status: 'DRAFT',
        steps: [{ id: 'step-1' }],
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);

      await expect(enrollContact('automation-1', 'contact-1')).rejects.toThrow(
        'Can only enroll contacts in active automations'
      );
    });
  });
});
