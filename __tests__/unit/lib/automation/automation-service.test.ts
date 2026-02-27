/**
 * Automation Service Unit Tests
 * Comprehensive test coverage for CRUD operations, step management, and enrollment management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAutomation,
  getAutomation,
  listAutomations,
  updateAutomation,
  deleteAutomation,
  activateAutomation,
  pauseAutomation,
  archiveAutomation,
  addStep,
  updateStep,
  removeStep,
  reorderSteps,
  enrollContact,
  exitEnrollment,
  completeEnrollment,
  getEnrollment,
  listEnrollments,
  createStepExecution,
  updateStepExecution,
  getPendingExecutions,
} from '@/lib/automation/automation-service';

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

const mockDate = new Date('2024-01-01T00:00:00Z');
const mockFutureDate = new Date('2024-01-02T00:00:00Z');

describe('Automation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mockDate);
  });

  // ==================== Automation CRUD Tests ====================

  describe('createAutomation', () => {
    it('should_create_automation_with_minimal_input', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockAutomation = {
        id: 'auto-1',
        name: 'Welcome Series',
        description: null,
        triggerType: 'SIGNUP',
        triggerConfig: {},
        status: 'DRAFT',
        userId: 'user-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [],
      };

      vi.mocked(prisma.automation.create).mockResolvedValue(mockAutomation);

      // Act
      const result = await createAutomation({
        name: 'Welcome Series',
        triggerType: 'SIGNUP',
      });

      // Assert
      expect(result).toEqual(mockAutomation);
      expect(prisma.automation.create).toHaveBeenCalledWith({
        data: {
          name: 'Welcome Series',
          description: undefined,
          triggerType: 'SIGNUP',
          triggerConfig: {},
          userId: undefined,
        },
        include: { steps: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    it('should_create_automation_with_description_and_user_id', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockAutomation = {
        id: 'auto-1',
        name: 'Test Automation',
        description: 'This is a test',
        triggerType: 'MANUAL',
        triggerConfig: { key: 'value' },
        status: 'DRAFT',
        userId: 'user-123',
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [],
      };

      vi.mocked(prisma.automation.create).mockResolvedValue(mockAutomation);

      // Act
      const result = await createAutomation(
        {
          name: 'Test Automation',
          description: 'This is a test',
          triggerType: 'MANUAL',
          triggerConfig: { key: 'value' },
        },
        'user-123'
      );

      // Assert
      expect(result.userId).toBe('user-123');
      expect(result.description).toBe('This is a test');
    });

    it('should_create_automation_with_steps', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockAutomation = {
        id: 'auto-1',
        name: 'With Steps',
        description: null,
        triggerType: 'SIGNUP',
        triggerConfig: {},
        status: 'DRAFT',
        userId: 'user-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [
          {
            id: 'step-1',
            automationId: 'auto-1',
            stepType: 'EMAIL',
            name: 'Welcome Email',
            config: { subject: 'Welcome!' },
            nextStepId: null,
            trueStepId: null,
            falseStepId: null,
            positionX: 0,
            positionY: 0,
            sortOrder: 0,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      };

      vi.mocked(prisma.automation.create).mockResolvedValue(mockAutomation);

      // Act
      const result = await createAutomation(
        {
          name: 'With Steps',
          triggerType: 'SIGNUP',
          steps: [
            {
              stepType: 'EMAIL',
              name: 'Welcome Email',
              config: { subject: 'Welcome!' },
            },
          ],
        },
        'user-1'
      );

      // Assert
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].name).toBe('Welcome Email');
      expect(prisma.automation.create).toHaveBeenCalled();
    });

    it('should_set_sort_order_for_steps_when_not_provided', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockAutomation = {
        id: 'auto-1',
        name: 'Test',
        description: null,
        triggerType: 'MANUAL',
        triggerConfig: {},
        status: 'DRAFT',
        userId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [
          {
            id: 'step-1',
            automationId: 'auto-1',
            stepType: 'EMAIL',
            name: 'Step 1',
            config: {},
            nextStepId: null,
            trueStepId: null,
            falseStepId: null,
            positionX: 0,
            positionY: 0,
            sortOrder: 0,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
          {
            id: 'step-2',
            automationId: 'auto-1',
            stepType: 'DELAY',
            name: 'Step 2',
            config: {},
            nextStepId: null,
            trueStepId: null,
            falseStepId: null,
            positionX: 0,
            positionY: 0,
            sortOrder: 1,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      };

      vi.mocked(prisma.automation.create).mockResolvedValue(mockAutomation);

      // Act
      await createAutomation({
        name: 'Test',
        triggerType: 'MANUAL',
        steps: [
          { stepType: 'EMAIL', name: 'Step 1', config: {} },
          { stepType: 'DELAY', name: 'Step 2', config: {} },
        ],
      });

      // Assert
      const call = vi.mocked(prisma.automation.create).mock.calls[0][0];
      const stepsCreate = call.data.steps?.create as Array<any>;
      expect(stepsCreate[0].sortOrder).toBe(0);
      expect(stepsCreate[1].sortOrder).toBe(1);
    });
  });

  describe('getAutomation', () => {
    it('should_return_automation_with_stats', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockAutomation = {
        id: 'auto-1',
        name: 'Test',
        description: null,
        triggerType: 'SIGNUP',
        triggerConfig: {},
        status: 'ACTIVE',
        userId: 'user-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [
          {
            id: 'step-1',
            automationId: 'auto-1',
            stepType: 'EMAIL',
            name: 'Welcome',
            config: {},
            nextStepId: null,
            trueStepId: null,
            falseStepId: null,
            positionX: 0,
            positionY: 0,
            sortOrder: 0,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
        enrollments: [
          { id: 'e1', status: 'ACTIVE' },
          { id: 'e2', status: 'COMPLETED' },
          { id: 'e3', status: 'EXITED' },
          { id: 'e4', status: 'FAILED' },
        ],
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);

      // Act
      const result = await getAutomation('auto-1');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.stats.totalEnrollments).toBe(4);
      expect(result?.stats.activeEnrollments).toBe(1);
      expect(result?.stats.completedEnrollments).toBe(1);
      expect(result?.stats.exitedEnrollments).toBe(1);
      expect(result?.stats.failedEnrollments).toBe(1);
    });

    it('should_return_null_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act
      const result = await getAutomation('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should_include_steps_ordered_by_sort_order', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockAutomation = {
        id: 'auto-1',
        name: 'Test',
        description: null,
        triggerType: 'MANUAL',
        triggerConfig: {},
        status: 'DRAFT',
        userId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [
          {
            id: 'step-1',
            automationId: 'auto-1',
            stepType: 'EMAIL',
            name: 'First',
            config: {},
            nextStepId: null,
            trueStepId: null,
            falseStepId: null,
            positionX: 0,
            positionY: 0,
            sortOrder: 0,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
          {
            id: 'step-2',
            automationId: 'auto-1',
            stepType: 'DELAY',
            name: 'Second',
            config: {},
            nextStepId: null,
            trueStepId: null,
            falseStepId: null,
            positionX: 0,
            positionY: 0,
            sortOrder: 1,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
        enrollments: [],
      };

      vi.mocked(prisma.automation.findUnique).mockResolvedValue(mockAutomation as never);

      // Act
      const result = await getAutomation('auto-1');

      // Assert
      expect(result?.steps).toHaveLength(2);
      expect(result?.steps[0].sortOrder).toBe(0);
      expect(result?.steps[1].sortOrder).toBe(1);
    });
  });

  describe('listAutomations', () => {
    it('should_list_automations_with_default_pagination', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockAutomations = [
        {
          id: 'auto-1',
          name: 'Test 1',
          description: null,
          triggerType: 'SIGNUP',
          triggerConfig: {},
          status: 'DRAFT',
          userId: 'user-1',
          createdAt: mockDate,
          updatedAt: mockDate,
          steps: [],
          enrollments: [],
        },
      ];

      vi.mocked(prisma.automation.findMany).mockResolvedValue(mockAutomations as never);
      vi.mocked(prisma.automation.count).mockResolvedValue(1);

      // Act
      const result = await listAutomations({});

      // Assert
      expect(result.automations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.automation.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          steps: { orderBy: { sortOrder: 'asc' } },
          enrollments: true,
        },
      });
    });

    it('should_filter_by_userId', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automation.count).mockResolvedValue(0);

      // Act
      await listAutomations({ userId: 'user-1' });

      // Assert
      const call = vi.mocked(prisma.automation.findMany).mock.calls[0][0];
      expect(call.where.userId).toBe('user-1');
    });

    it('should_filter_by_status', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automation.count).mockResolvedValue(0);

      // Act
      await listAutomations({ status: 'ACTIVE' });

      // Assert
      const call = vi.mocked(prisma.automation.findMany).mock.calls[0][0];
      expect(call.where.status).toBe('ACTIVE');
    });

    it('should_apply_custom_pagination', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automation.count).mockResolvedValue(100);

      // Act
      await listAutomations({ page: 3, limit: 50 });

      // Assert
      const call = vi.mocked(prisma.automation.findMany).mock.calls[0][0];
      expect(call.skip).toBe(100); // (3 - 1) * 50
      expect(call.take).toBe(50);
    });

    it('should_combine_filters_and_pagination', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automation.count).mockResolvedValue(5);

      // Act
      await listAutomations({
        userId: 'user-1',
        status: 'ACTIVE',
        page: 2,
        limit: 10,
      });

      // Assert
      const call = vi.mocked(prisma.automation.findMany).mock.calls[0][0];
      expect(call.where.userId).toBe('user-1');
      expect(call.where.status).toBe('ACTIVE');
      expect(call.skip).toBe(10);
      expect(call.take).toBe(10);
    });
  });

  describe('updateAutomation', () => {
    it('should_update_automation_details', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
      } as never);
      const updatedAutomation = {
        id: 'auto-1',
        name: 'Updated Name',
        description: 'Updated description',
        triggerType: 'MANUAL',
        triggerConfig: {},
        status: 'DRAFT',
        userId: 'user-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [],
      };
      vi.mocked(prisma.automation.update).mockResolvedValue(updatedAutomation as never);

      // Act
      const result = await updateAutomation('auto-1', {
        name: 'Updated Name',
        description: 'Updated description',
        triggerType: 'MANUAL',
      });

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
    });

    it('should_throw_error_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(
        updateAutomation('non-existent', { name: 'Test' })
      ).rejects.toThrow('Automation not found');
    });

    it('should_prevent_updating_active_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
      } as never);

      // Act & Assert
      await expect(
        updateAutomation('auto-1', { name: 'Updated' })
      ).rejects.toThrow('Cannot update an active automation. Pause it first.');
    });

    it('should_allow_partial_updates', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
        name: 'Original',
      } as never);
      vi.mocked(prisma.automation.update).mockResolvedValue({
        id: 'auto-1',
        name: 'Updated',
        description: null,
        triggerType: 'SIGNUP',
        triggerConfig: {},
        status: 'DRAFT',
        userId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        steps: [],
      } as never);

      // Act
      await updateAutomation('auto-1', { name: 'Updated' });

      // Assert
      const call = vi.mocked(prisma.automation.update).mock.calls[0][0];
      expect(call.data.name).toBe('Updated');
      expect(call.data.description).toBeUndefined();
    });
  });

  describe('deleteAutomation', () => {
    it('should_delete_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
      } as never);
      vi.mocked(prisma.automation.delete).mockResolvedValue({ id: 'auto-1' } as never);

      // Act
      await deleteAutomation('auto-1');

      // Assert
      expect(prisma.automation.delete).toHaveBeenCalledWith({
        where: { id: 'auto-1' },
      });
    });

    it('should_throw_error_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(deleteAutomation('non-existent')).rejects.toThrow(
        'Automation not found'
      );
    });
  });

  describe('activateAutomation', () => {
    it('should_activate_draft_automation_with_steps', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
        steps: [{ id: 'step-1' }],
      } as never);
      vi.mocked(prisma.automation.update).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
      } as never);

      // Act
      const result = await activateAutomation('auto-1');

      // Assert
      expect(result.status).toBe('ACTIVE');
    });

    it('should_throw_error_for_already_active_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [{ id: 'step-1' }],
      } as never);

      // Act & Assert
      await expect(activateAutomation('auto-1')).rejects.toThrow(
        'Automation is already active'
      );
    });

    it('should_throw_error_for_automation_without_steps', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
        steps: [],
      } as never);

      // Act & Assert
      await expect(activateAutomation('auto-1')).rejects.toThrow(
        'Automation must have at least one step'
      );
    });

    it('should_throw_error_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(activateAutomation('non-existent')).rejects.toThrow(
        'Automation not found'
      );
    });
  });

  describe('pauseAutomation', () => {
    it('should_pause_active_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
      } as never);
      vi.mocked(prisma.automation.update).mockResolvedValue({
        id: 'auto-1',
        status: 'PAUSED',
      } as never);

      // Act
      const result = await pauseAutomation('auto-1');

      // Assert
      expect(result.status).toBe('PAUSED');
    });

    it('should_throw_error_for_non_active_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
      } as never);

      // Act & Assert
      await expect(pauseAutomation('auto-1')).rejects.toThrow(
        'Can only pause active automations'
      );
    });

    it('should_throw_error_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(pauseAutomation('non-existent')).rejects.toThrow(
        'Automation not found'
      );
    });
  });

  describe('archiveAutomation', () => {
    it('should_archive_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
      } as never);
      vi.mocked(prisma.automation.update).mockResolvedValue({
        id: 'auto-1',
        status: 'ARCHIVED',
      } as never);

      // Act
      const result = await archiveAutomation('auto-1');

      // Assert
      expect(result.status).toBe('ARCHIVED');
    });

    it('should_throw_error_for_already_archived_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ARCHIVED',
      } as never);

      // Act & Assert
      await expect(archiveAutomation('auto-1')).rejects.toThrow(
        'Automation is already archived'
      );
    });

    it('should_throw_error_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(archiveAutomation('non-existent')).rejects.toThrow(
        'Automation not found'
      );
    });
  });

  // ==================== Step Management Tests ====================

  describe('addStep', () => {
    it('should_add_step_to_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
        steps: [{ id: 'step-1', sortOrder: 0 }],
      } as never);
      const newStep = {
        id: 'step-2',
        automationId: 'auto-1',
        stepType: 'DELAY',
        name: 'Wait 1 Day',
        config: { duration: 1, unit: 'days' },
        nextStepId: null,
        trueStepId: null,
        falseStepId: null,
        positionX: 0,
        positionY: 0,
        sortOrder: 1,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      vi.mocked(prisma.automationStep.create).mockResolvedValue(newStep as never);

      // Act
      const result = await addStep('auto-1', {
        stepType: 'DELAY',
        name: 'Wait 1 Day',
        config: { duration: 1, unit: 'days' },
      });

      // Assert
      expect(result.id).toBe('step-2');
      expect(result.name).toBe('Wait 1 Day');
    });

    it('should_use_automation_steps_length_as_default_sort_order', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
        steps: [{ id: 'step-1' }, { id: 'step-2' }, { id: 'step-3' }],
      } as never);
      vi.mocked(prisma.automationStep.create).mockResolvedValue({
        id: 'step-4',
        sortOrder: 3,
      } as never);

      // Act
      await addStep('auto-1', {
        stepType: 'EMAIL',
        name: 'Test',
        config: {},
      });

      // Assert
      const call = vi.mocked(prisma.automationStep.create).mock.calls[0][0];
      expect(call.data.sortOrder).toBe(3);
    });

    it('should_allow_custom_sort_order', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
        steps: [],
      } as never);
      vi.mocked(prisma.automationStep.create).mockResolvedValue({
        id: 'step-1',
        sortOrder: 5,
      } as never);

      // Act
      await addStep('auto-1', {
        stepType: 'EMAIL',
        name: 'Test',
        config: {},
        sortOrder: 5,
      });

      // Assert
      const call = vi.mocked(prisma.automationStep.create).mock.calls[0][0];
      expect(call.data.sortOrder).toBe(5);
    });

    it('should_throw_error_for_inactive_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [],
      } as never);

      // Act & Assert
      await expect(
        addStep('auto-1', {
          stepType: 'EMAIL',
          name: 'Test',
          config: {},
        })
      ).rejects.toThrow('Cannot add steps to an active automation');
    });

    it('should_throw_error_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(
        addStep('non-existent', {
          stepType: 'EMAIL',
          name: 'Test',
          config: {},
        })
      ).rejects.toThrow('Automation not found');
    });
  });

  describe('updateStep', () => {
    it('should_update_step_configuration', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStep.findUnique).mockResolvedValue({
        id: 'step-1',
        automation: { status: 'DRAFT' },
      } as never);
      const updatedStep = {
        id: 'step-1',
        automationId: 'auto-1',
        stepType: 'EMAIL',
        name: 'Updated Email',
        config: { subject: 'New Subject' },
        nextStepId: null,
        trueStepId: null,
        falseStepId: null,
        positionX: 100,
        positionY: 200,
        sortOrder: 0,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      vi.mocked(prisma.automationStep.update).mockResolvedValue(updatedStep as never);

      // Act
      const result = await updateStep('step-1', {
        name: 'Updated Email',
        config: { subject: 'New Subject' },
        positionX: 100,
        positionY: 200,
      });

      // Assert
      expect(result.name).toBe('Updated Email');
    });

    it('should_throw_error_for_active_automation_step', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStep.findUnique).mockResolvedValue({
        id: 'step-1',
        automation: { status: 'ACTIVE' },
      } as never);

      // Act & Assert
      await expect(
        updateStep('step-1', { name: 'Updated' })
      ).rejects.toThrow('Cannot update steps of an active automation');
    });

    it('should_throw_error_when_step_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStep.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(updateStep('non-existent', { name: 'Test' })).rejects.toThrow(
        'Step not found'
      );
    });
  });

  describe('removeStep', () => {
    it('should_remove_step_and_clear_references', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStep.findUnique).mockResolvedValue({
        id: 'step-2',
        automationId: 'auto-1',
        automation: { status: 'DRAFT' },
      } as never);
      vi.mocked(prisma.automationStep.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.automationStep.delete).mockResolvedValue({ id: 'step-2' } as never);

      // Act
      await removeStep('step-2');

      // Assert
      expect(prisma.automationStep.updateMany).toHaveBeenCalled();
      expect(prisma.automationStep.delete).toHaveBeenCalledWith({
        where: { id: 'step-2' },
      });
    });

    it('should_clear_nextStepId_references', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStep.findUnique).mockResolvedValue({
        id: 'step-1',
        automationId: 'auto-1',
        automation: { status: 'DRAFT' },
      } as never);
      vi.mocked(prisma.automationStep.updateMany).mockResolvedValue({ count: 0 } as never);
      vi.mocked(prisma.automationStep.delete).mockResolvedValue({ id: 'step-1' } as never);

      // Act
      await removeStep('step-1');

      // Assert
      const call = vi.mocked(prisma.automationStep.updateMany).mock.calls[0][0];
      expect(call.data).toEqual({
        nextStepId: null,
        trueStepId: null,
        falseStepId: null,
      });
    });

    it('should_throw_error_for_active_automation_step', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStep.findUnique).mockResolvedValue({
        id: 'step-1',
        automation: { status: 'ACTIVE' },
      } as never);

      // Act & Assert
      await expect(removeStep('step-1')).rejects.toThrow(
        'Cannot remove steps from an active automation'
      );
    });

    it('should_throw_error_when_step_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStep.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(removeStep('non-existent')).rejects.toThrow('Step not found');
    });
  });

  describe('reorderSteps', () => {
    it('should_reorder_steps_in_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
      } as never);
      vi.mocked(prisma.automationStep.update)
        .mockResolvedValueOnce({ id: 'step-2', sortOrder: 0 } as never)
        .mockResolvedValueOnce({ id: 'step-1', sortOrder: 1 } as never)
        .mockResolvedValueOnce({ id: 'step-3', sortOrder: 2 } as never);
      vi.mocked(prisma.automationStep.findMany).mockResolvedValue([
        { id: 'step-2', sortOrder: 0 },
        { id: 'step-1', sortOrder: 1 },
        { id: 'step-3', sortOrder: 2 },
      ] as never);

      // Act
      const result = await reorderSteps('auto-1', ['step-2', 'step-1', 'step-3']);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('step-2');
      expect(prisma.automationStep.update).toHaveBeenCalledTimes(3);
    });

    it('should_throw_error_for_active_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
      } as never);

      // Act & Assert
      await expect(
        reorderSteps('auto-1', ['step-1', 'step-2'])
      ).rejects.toThrow('Cannot reorder steps of an active automation');
    });

    it('should_throw_error_when_automation_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(reorderSteps('non-existent', ['step-1'])).rejects.toThrow(
        'Automation not found'
      );
    });
  });

  // ==================== Enrollment Management Tests ====================

  describe('enrollContact', () => {
    it('should_enroll_contact_in_active_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [{ id: 'step-1', sortOrder: 0 }],
      } as never);
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue(null);
      const enrollment = {
        id: 'enrollment-1',
        automationId: 'auto-1',
        contactId: 'contact-1',
        status: 'ACTIVE',
        currentStepId: 'step-1',
        startedAt: mockDate,
        completedAt: null,
        exitedAt: null,
        exitReason: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      vi.mocked(prisma.automationEnrollment.upsert).mockResolvedValue(enrollment as never);

      // Act
      const result = await enrollContact('auto-1', 'contact-1');

      // Assert
      expect(result.status).toBe('ACTIVE');
      expect(result.currentStepId).toBe('step-1');
    });

    it('should_use_first_step_as_default_start', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [
          { id: 'step-1', sortOrder: 0 },
          { id: 'step-2', sortOrder: 1 },
        ],
      } as never);
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.automationEnrollment.upsert).mockResolvedValue({
        id: 'enrollment-1',
        currentStepId: 'step-1',
      } as never);

      // Act
      await enrollContact('auto-1', 'contact-1');

      // Assert
      const call = vi.mocked(prisma.automationEnrollment.upsert).mock.calls[0][0];
      expect(call.create.currentStepId).toBe('step-1');
    });

    it('should_allow_custom_start_step', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [
          { id: 'step-1', sortOrder: 0 },
          { id: 'step-2', sortOrder: 1 },
        ],
      } as never);
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.automationEnrollment.upsert).mockResolvedValue({
        id: 'enrollment-1',
        currentStepId: 'step-2',
      } as never);

      // Act
      await enrollContact('auto-1', 'contact-1', 'step-2');

      // Assert
      const call = vi.mocked(prisma.automationEnrollment.upsert).mock.calls[0][0];
      expect(call.create.currentStepId).toBe('step-2');
    });

    it('should_reactivate_exited_enrollment', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [{ id: 'step-1', sortOrder: 0 }],
      } as never);
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue({
        status: 'EXITED',
      } as never);
      vi.mocked(prisma.automationEnrollment.upsert).mockResolvedValue({
        id: 'enrollment-1',
        status: 'ACTIVE',
      } as never);

      // Act
      const result = await enrollContact('auto-1', 'contact-1');

      // Assert
      expect(result.status).toBe('ACTIVE');
      const call = vi.mocked(prisma.automationEnrollment.upsert).mock.calls[0][0];
      expect(call.update.exitedAt).toBeNull();
    });

    it('should_throw_error_for_inactive_automation', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'DRAFT',
        steps: [{ id: 'step-1' }],
      } as never);

      // Act & Assert
      await expect(enrollContact('auto-1', 'contact-1')).rejects.toThrow(
        'Can only enroll contacts in active automations'
      );
    });

    it('should_throw_error_when_already_actively_enrolled', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [{ id: 'step-1' }],
      } as never);
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue({
        status: 'ACTIVE',
      } as never);

      // Act & Assert
      await expect(enrollContact('auto-1', 'contact-1')).rejects.toThrow(
        'Contact is already enrolled in this automation'
      );
    });

    it('should_throw_error_when_automation_has_no_steps', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automation.findUnique).mockResolvedValue({
        id: 'auto-1',
        status: 'ACTIVE',
        steps: [],
      } as never);
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(enrollContact('auto-1', 'contact-1')).rejects.toThrow(
        'Automation has no steps'
      );
    });
  });

  describe('exitEnrollment', () => {
    it('should_exit_active_enrollment', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue({
        id: 'enrollment-1',
        status: 'ACTIVE',
      } as never);
      const exitedEnrollment = {
        id: 'enrollment-1',
        status: 'EXITED',
        exitedAt: mockDate,
        exitReason: 'Manual exit',
      };
      vi.mocked(prisma.automationEnrollment.update).mockResolvedValue(
        exitedEnrollment as never
      );

      // Act
      const result = await exitEnrollment('enrollment-1');

      // Assert
      expect(result.status).toBe('EXITED');
      expect(result.exitReason).toBe('Manual exit');
    });

    it('should_allow_custom_exit_reason', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue({
        id: 'enrollment-1',
        status: 'ACTIVE',
      } as never);
      vi.mocked(prisma.automationEnrollment.update).mockResolvedValue({
        id: 'enrollment-1',
        status: 'EXITED',
        exitReason: 'Unsubscribed',
      } as never);

      // Act
      const result = await exitEnrollment('enrollment-1', 'Unsubscribed');

      // Assert
      expect(result.exitReason).toBe('Unsubscribed');
    });

    it('should_throw_error_for_inactive_enrollment', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue({
        id: 'enrollment-1',
        status: 'EXITED',
      } as never);

      // Act & Assert
      await expect(exitEnrollment('enrollment-1')).rejects.toThrow(
        'Enrollment is not active'
      );
    });

    it('should_throw_error_when_enrollment_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(exitEnrollment('non-existent')).rejects.toThrow(
        'Enrollment not found'
      );
    });
  });

  describe('completeEnrollment', () => {
    it('should_complete_enrollment', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const completed = {
        id: 'enrollment-1',
        status: 'COMPLETED',
        completedAt: mockDate,
        currentStepId: null,
      };
      vi.mocked(prisma.automationEnrollment.update).mockResolvedValue(completed as never);

      // Act
      const result = await completeEnrollment('enrollment-1');

      // Assert
      expect(result.status).toBe('COMPLETED');
      expect(result.currentStepId).toBeNull();
    });
  });

  describe('getEnrollment', () => {
    it('should_return_enrollment_with_executions', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue({
        id: 'enrollment-1',
        automationId: 'auto-1',
        contactId: 'contact-1',
        status: 'ACTIVE',
        currentStepId: 'step-1',
        startedAt: mockDate,
        completedAt: null,
        exitedAt: null,
        exitReason: null,
        stepExecutions: [
          {
            id: 'exec-1',
            stepId: 'step-1',
            status: 'COMPLETED',
            result: { success: true },
            scheduledAt: null,
            startedAt: mockDate,
            completedAt: mockDate,
            error: null,
          },
        ],
      } as never);

      // Act
      const result = await getEnrollment('enrollment-1');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.stepExecutions).toHaveLength(1);
      expect(result?.stepExecutions[0].status).toBe('COMPLETED');
    });

    it('should_return_null_when_enrollment_not_found', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findUnique).mockResolvedValue(null);

      // Act
      const result = await getEnrollment('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listEnrollments', () => {
    it('should_list_enrollments_with_default_pagination', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          status: 'ACTIVE',
          startedAt: mockDate,
        },
      ];
      vi.mocked(prisma.automationEnrollment.findMany).mockResolvedValue(
        mockEnrollments as never
      );
      vi.mocked(prisma.automationEnrollment.count).mockResolvedValue(1);

      // Act
      const result = await listEnrollments('auto-1', {});

      // Assert
      expect(result.enrollments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.automationEnrollment.findMany).toHaveBeenCalledWith({
        where: { automationId: 'auto-1' },
        skip: 0,
        take: 20,
        orderBy: { startedAt: 'desc' },
      });
    });

    it('should_filter_by_status', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automationEnrollment.count).mockResolvedValue(0);

      // Act
      await listEnrollments('auto-1', { status: 'ACTIVE' });

      // Assert
      const call = vi.mocked(prisma.automationEnrollment.findMany).mock.calls[0][0];
      expect(call.where.status).toBe('ACTIVE');
    });

    it('should_apply_custom_pagination', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationEnrollment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automationEnrollment.count).mockResolvedValue(50);

      // Act
      await listEnrollments('auto-1', { page: 2, limit: 25 });

      // Assert
      const call = vi.mocked(prisma.automationEnrollment.findMany).mock.calls[0][0];
      expect(call.skip).toBe(25);
      expect(call.take).toBe(25);
    });
  });

  // ==================== Step Execution Tests ====================

  describe('createStepExecution', () => {
    it('should_create_pending_execution_by_default', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const execution = {
        id: 'exec-1',
        enrollmentId: 'enrollment-1',
        stepId: 'step-1',
        status: 'PENDING',
        result: null,
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
        error: null,
        createdAt: mockDate,
      };
      vi.mocked(prisma.automationStepExecution.create).mockResolvedValue(execution as never);

      // Act
      const result = await createStepExecution('enrollment-1', 'step-1');

      // Assert
      expect(result.status).toBe('PENDING');
      expect(result.scheduledAt).toBeNull();
    });

    it('should_create_scheduled_execution_with_scheduled_date', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const execution = {
        id: 'exec-1',
        enrollmentId: 'enrollment-1',
        stepId: 'step-1',
        status: 'SCHEDULED',
        result: null,
        scheduledAt: mockFutureDate,
        startedAt: null,
        completedAt: null,
        error: null,
        createdAt: mockDate,
      };
      vi.mocked(prisma.automationStepExecution.create).mockResolvedValue(execution as never);

      // Act
      const result = await createStepExecution('enrollment-1', 'step-1', mockFutureDate);

      // Assert
      expect(result.status).toBe('SCHEDULED');
      expect(result.scheduledAt).toEqual(mockFutureDate);
    });
  });

  describe('updateStepExecution', () => {
    it('should_update_execution_status', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const updated = {
        id: 'exec-1',
        status: 'RUNNING',
        result: null,
        error: null,
        startedAt: mockDate,
        completedAt: null,
      };
      vi.mocked(prisma.automationStepExecution.update).mockResolvedValue(updated as never);

      // Act
      const result = await updateStepExecution('exec-1', {
        status: 'RUNNING',
        startedAt: mockDate,
      });

      // Assert
      expect(result.status).toBe('RUNNING');
    });

    it('should_update_with_result_and_error', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const updated = {
        id: 'exec-1',
        status: 'FAILED',
        result: null,
        error: 'Network timeout',
        startedAt: mockDate,
        completedAt: mockDate,
      };
      vi.mocked(prisma.automationStepExecution.update).mockResolvedValue(updated as never);

      // Act
      const result = await updateStepExecution('exec-1', {
        status: 'FAILED',
        error: 'Network timeout',
        completedAt: mockDate,
      });

      // Assert
      expect(result.error).toBe('Network timeout');
      expect(result.status).toBe('FAILED');
    });
  });

  describe('getPendingExecutions', () => {
    it('should_get_pending_executions', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      const executions = [
        {
          id: 'exec-1',
          enrollmentId: 'enrollment-1',
          stepId: 'step-1',
          status: 'PENDING',
          result: null,
          scheduledAt: null,
          startedAt: null,
          completedAt: null,
          error: null,
          createdAt: mockDate,
          step: { id: 'step-1' },
          enrollment: {
            id: 'enrollment-1',
            status: 'ACTIVE',
            automation: { status: 'ACTIVE' },
          },
        },
      ];
      vi.mocked(prisma.automationStepExecution.findMany).mockResolvedValue(
        executions as never
      );

      // Act
      const result = await getPendingExecutions(100);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING');
    });

    it('should_include_scheduled_executions_past_due', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStepExecution.findMany).mockResolvedValue([]);

      // Act
      await getPendingExecutions(100);

      // Assert
      const call = vi.mocked(prisma.automationStepExecution.findMany).mock.calls[0][0];
      const where = call.where as any;
      expect(where.OR).toContainEqual({ status: 'PENDING' });
      expect(where.OR[1].status).toBe('SCHEDULED');
    });

    it('should_only_include_active_enrollments_in_active_automations', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStepExecution.findMany).mockResolvedValue([]);

      // Act
      await getPendingExecutions(100);

      // Assert
      const call = vi.mocked(prisma.automationStepExecution.findMany).mock.calls[0][0];
      const where = call.where as any;
      expect(where.enrollment.status).toBe('ACTIVE');
      expect(where.enrollment.automation.status).toBe('ACTIVE');
    });

    it('should_respect_limit_parameter', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStepExecution.findMany).mockResolvedValue([]);

      // Act
      await getPendingExecutions(50);

      // Assert
      const call = vi.mocked(prisma.automationStepExecution.findMany).mock.calls[0][0];
      expect(call.take).toBe(50);
    });

    it('should_order_by_scheduled_time_then_created_time', async () => {
      // Arrange
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.automationStepExecution.findMany).mockResolvedValue([]);

      // Act
      await getPendingExecutions(100);

      // Assert
      const call = vi.mocked(prisma.automationStepExecution.findMany).mock.calls[0][0];
      expect(call.orderBy).toEqual([
        { scheduledAt: 'asc' },
        { createdAt: 'asc' },
      ]);
    });
  });
});
