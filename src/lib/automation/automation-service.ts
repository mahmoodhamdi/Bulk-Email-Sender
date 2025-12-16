/**
 * Automation Workflow Service
 * Server-side logic for automation workflow management
 */

import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';
import type {
  Automation,
  AutomationStep,
  AutomationEnrollment,
  AutomationStepExecution,
  AutomationStatus,
} from '@prisma/client';
import type {
  CreateAutomationInput,
  UpdateAutomationInput,
  CreateStepInput,
  UpdateStepInput,
  AutomationWithStats,
  EnrollmentWithExecutions,
} from './types';

/**
 * Create a new automation
 */
export async function createAutomation(
  input: CreateAutomationInput,
  userId?: string
): Promise<Automation & { steps: AutomationStep[] }> {
  const automation = await prisma.automation.create({
    data: {
      name: input.name,
      description: input.description,
      triggerType: input.triggerType,
      triggerConfig: (input.triggerConfig || {}) as Prisma.InputJsonValue,
      userId,
      steps: input.steps
        ? {
            create: input.steps.map((step, index) => ({
              stepType: step.stepType,
              name: step.name,
              config: step.config as Prisma.InputJsonValue,
              positionX: step.positionX,
              positionY: step.positionY,
              sortOrder: step.sortOrder ?? index,
            })),
          }
        : undefined,
    },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return automation;
}

/**
 * Get an automation by ID with stats
 */
export async function getAutomation(automationId: string): Promise<AutomationWithStats | null> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
      },
      enrollments: true,
    },
  });

  if (!automation) {
    return null;
  }

  return calculateAutomationStats(automation);
}

/**
 * List automations with pagination
 */
export async function listAutomations(options: {
  userId?: string;
  status?: AutomationStatus;
  page?: number;
  limit?: number;
}): Promise<{ automations: AutomationWithStats[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.AutomationWhereInput = {};

  if (options.userId) {
    where.userId = options.userId;
  }

  if (options.status) {
    where.status = options.status;
  }

  const [automations, total] = await Promise.all([
    prisma.automation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        steps: {
          orderBy: { sortOrder: 'asc' },
        },
        enrollments: true,
      },
    }),
    prisma.automation.count({ where }),
  ]);

  const automationsWithStats = automations.map(calculateAutomationStats);

  return { automations: automationsWithStats, total };
}

/**
 * Update an automation
 */
export async function updateAutomation(
  automationId: string,
  input: UpdateAutomationInput
): Promise<Automation & { steps: AutomationStep[] }> {
  const existing = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!existing) {
    throw new Error('Automation not found');
  }

  if (existing.status === 'ACTIVE') {
    throw new Error('Cannot update an active automation. Pause it first.');
  }

  return prisma.automation.update({
    where: { id: automationId },
    data: {
      name: input.name,
      description: input.description,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig as Prisma.InputJsonValue | undefined,
    },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

/**
 * Delete an automation
 */
export async function deleteAutomation(automationId: string): Promise<void> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    throw new Error('Automation not found');
  }

  await prisma.automation.delete({
    where: { id: automationId },
  });
}

/**
 * Activate an automation
 */
export async function activateAutomation(automationId: string): Promise<Automation> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: { steps: true },
  });

  if (!automation) {
    throw new Error('Automation not found');
  }

  if (automation.status === 'ACTIVE') {
    throw new Error('Automation is already active');
  }

  if (automation.steps.length === 0) {
    throw new Error('Automation must have at least one step');
  }

  return prisma.automation.update({
    where: { id: automationId },
    data: { status: 'ACTIVE' },
  });
}

/**
 * Pause an automation
 */
export async function pauseAutomation(automationId: string): Promise<Automation> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    throw new Error('Automation not found');
  }

  if (automation.status !== 'ACTIVE') {
    throw new Error('Can only pause active automations');
  }

  return prisma.automation.update({
    where: { id: automationId },
    data: { status: 'PAUSED' },
  });
}

/**
 * Archive an automation
 */
export async function archiveAutomation(automationId: string): Promise<Automation> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    throw new Error('Automation not found');
  }

  if (automation.status === 'ARCHIVED') {
    throw new Error('Automation is already archived');
  }

  return prisma.automation.update({
    where: { id: automationId },
    data: { status: 'ARCHIVED' },
  });
}

// ==================== Step Management ====================

/**
 * Add a step to an automation
 */
export async function addStep(
  automationId: string,
  input: CreateStepInput
): Promise<AutomationStep> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: { steps: true },
  });

  if (!automation) {
    throw new Error('Automation not found');
  }

  if (automation.status === 'ACTIVE') {
    throw new Error('Cannot add steps to an active automation');
  }

  return prisma.automationStep.create({
    data: {
      automationId,
      stepType: input.stepType,
      name: input.name,
      config: input.config as Prisma.InputJsonValue,
      nextStepId: input.nextStepId,
      trueStepId: input.trueStepId,
      falseStepId: input.falseStepId,
      positionX: input.positionX,
      positionY: input.positionY,
      sortOrder: input.sortOrder ?? automation.steps.length,
    },
  });
}

/**
 * Update a step
 */
export async function updateStep(
  stepId: string,
  input: UpdateStepInput
): Promise<AutomationStep> {
  const step = await prisma.automationStep.findUnique({
    where: { id: stepId },
    include: { automation: true },
  });

  if (!step) {
    throw new Error('Step not found');
  }

  if (step.automation.status === 'ACTIVE') {
    throw new Error('Cannot update steps of an active automation');
  }

  return prisma.automationStep.update({
    where: { id: stepId },
    data: {
      name: input.name,
      config: input.config as Prisma.InputJsonValue | undefined,
      nextStepId: input.nextStepId,
      trueStepId: input.trueStepId,
      falseStepId: input.falseStepId,
      positionX: input.positionX,
      positionY: input.positionY,
      sortOrder: input.sortOrder,
    },
  });
}

/**
 * Remove a step from an automation
 */
export async function removeStep(stepId: string): Promise<void> {
  const step = await prisma.automationStep.findUnique({
    where: { id: stepId },
    include: { automation: true },
  });

  if (!step) {
    throw new Error('Step not found');
  }

  if (step.automation.status === 'ACTIVE') {
    throw new Error('Cannot remove steps from an active automation');
  }

  // Clear references to this step from other steps
  await prisma.automationStep.updateMany({
    where: {
      automationId: step.automationId,
      OR: [
        { nextStepId: stepId },
        { trueStepId: stepId },
        { falseStepId: stepId },
      ],
    },
    data: {
      nextStepId: null,
      trueStepId: null,
      falseStepId: null,
    },
  });

  await prisma.automationStep.delete({
    where: { id: stepId },
  });
}

/**
 * Reorder steps
 */
export async function reorderSteps(
  automationId: string,
  stepIds: string[]
): Promise<AutomationStep[]> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    throw new Error('Automation not found');
  }

  if (automation.status === 'ACTIVE') {
    throw new Error('Cannot reorder steps of an active automation');
  }

  // Update sort order for each step
  await Promise.all(
    stepIds.map((stepId, index) =>
      prisma.automationStep.update({
        where: { id: stepId },
        data: { sortOrder: index },
      })
    )
  );

  return prisma.automationStep.findMany({
    where: { automationId },
    orderBy: { sortOrder: 'asc' },
  });
}

// ==================== Enrollment Management ====================

/**
 * Enroll a contact in an automation
 */
export async function enrollContact(
  automationId: string,
  contactId: string,
  startStepId?: string
): Promise<AutomationEnrollment> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!automation) {
    throw new Error('Automation not found');
  }

  if (automation.status !== 'ACTIVE') {
    throw new Error('Can only enroll contacts in active automations');
  }

  // Check if contact is already enrolled
  const existingEnrollment = await prisma.automationEnrollment.findUnique({
    where: {
      automationId_contactId: {
        automationId,
        contactId,
      },
    },
  });

  if (existingEnrollment && existingEnrollment.status === 'ACTIVE') {
    throw new Error('Contact is already enrolled in this automation');
  }

  // Determine start step
  const firstStepId = startStepId || automation.steps[0]?.id;

  if (!firstStepId) {
    throw new Error('Automation has no steps');
  }

  // Create or update enrollment
  const enrollment = await prisma.automationEnrollment.upsert({
    where: {
      automationId_contactId: {
        automationId,
        contactId,
      },
    },
    create: {
      automationId,
      contactId,
      status: 'ACTIVE',
      currentStepId: firstStepId,
      startedAt: new Date(),
    },
    update: {
      status: 'ACTIVE',
      currentStepId: firstStepId,
      startedAt: new Date(),
      completedAt: null,
      exitedAt: null,
      exitReason: null,
    },
  });

  return enrollment;
}

/**
 * Exit a contact from an automation
 */
export async function exitEnrollment(
  enrollmentId: string,
  reason?: string
): Promise<AutomationEnrollment> {
  const enrollment = await prisma.automationEnrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  if (enrollment.status !== 'ACTIVE') {
    throw new Error('Enrollment is not active');
  }

  return prisma.automationEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'EXITED',
      exitedAt: new Date(),
      exitReason: reason || 'Manual exit',
    },
  });
}

/**
 * Complete an enrollment
 */
export async function completeEnrollment(
  enrollmentId: string
): Promise<AutomationEnrollment> {
  return prisma.automationEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      currentStepId: null,
    },
  });
}

/**
 * Get enrollment details with executions
 */
export async function getEnrollment(
  enrollmentId: string
): Promise<EnrollmentWithExecutions | null> {
  const enrollment = await prisma.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      stepExecutions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!enrollment) {
    return null;
  }

  return {
    id: enrollment.id,
    automationId: enrollment.automationId,
    contactId: enrollment.contactId,
    status: enrollment.status,
    currentStepId: enrollment.currentStepId,
    startedAt: enrollment.startedAt,
    completedAt: enrollment.completedAt,
    exitedAt: enrollment.exitedAt,
    exitReason: enrollment.exitReason,
    stepExecutions: enrollment.stepExecutions.map((exec) => ({
      id: exec.id,
      stepId: exec.stepId,
      status: exec.status,
      result: exec.result,
      scheduledAt: exec.scheduledAt,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt,
      error: exec.error,
    })),
  };
}

/**
 * List enrollments for an automation
 */
export async function listEnrollments(
  automationId: string,
  options: {
    status?: 'ACTIVE' | 'COMPLETED' | 'EXITED' | 'FAILED';
    page?: number;
    limit?: number;
  }
): Promise<{ enrollments: AutomationEnrollment[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.AutomationEnrollmentWhereInput = {
    automationId,
  };

  if (options.status) {
    where.status = options.status;
  }

  const [enrollments, total] = await Promise.all([
    prisma.automationEnrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: 'desc' },
    }),
    prisma.automationEnrollment.count({ where }),
  ]);

  return { enrollments, total };
}

// ==================== Step Execution ====================

/**
 * Create a step execution
 */
export async function createStepExecution(
  enrollmentId: string,
  stepId: string,
  scheduledAt?: Date
): Promise<AutomationStepExecution> {
  return prisma.automationStepExecution.create({
    data: {
      enrollmentId,
      stepId,
      status: scheduledAt ? 'SCHEDULED' : 'PENDING',
      scheduledAt,
    },
  });
}

/**
 * Update step execution status
 */
export async function updateStepExecution(
  executionId: string,
  data: {
    status?: 'PENDING' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
    result?: Record<string, unknown>;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }
): Promise<AutomationStepExecution> {
  return prisma.automationStepExecution.update({
    where: { id: executionId },
    data: {
      status: data.status,
      result: data.result as Prisma.InputJsonValue | undefined,
      error: data.error,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
    },
  });
}

/**
 * Get pending step executions
 */
export async function getPendingExecutions(
  limit: number = 100
): Promise<AutomationStepExecution[]> {
  const now = new Date();

  return prisma.automationStepExecution.findMany({
    where: {
      OR: [
        { status: 'PENDING' },
        {
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
        },
      ],
      enrollment: {
        status: 'ACTIVE',
        automation: { status: 'ACTIVE' },
      },
    },
    take: limit,
    orderBy: [
      { scheduledAt: 'asc' },
      { createdAt: 'asc' },
    ],
    include: {
      step: true,
      enrollment: {
        include: {
          automation: true,
        },
      },
    },
  });
}

// ==================== Helper Functions ====================

/**
 * Calculate automation stats
 */
function calculateAutomationStats(
  automation: Automation & {
    steps: AutomationStep[];
    enrollments: AutomationEnrollment[];
  }
): AutomationWithStats {
  const stats = {
    totalEnrollments: automation.enrollments.length,
    activeEnrollments: automation.enrollments.filter((e) => e.status === 'ACTIVE').length,
    completedEnrollments: automation.enrollments.filter((e) => e.status === 'COMPLETED').length,
    exitedEnrollments: automation.enrollments.filter((e) => e.status === 'EXITED').length,
    failedEnrollments: automation.enrollments.filter((e) => e.status === 'FAILED').length,
  };

  return {
    id: automation.id,
    name: automation.name,
    description: automation.description,
    triggerType: automation.triggerType,
    triggerConfig: automation.triggerConfig,
    status: automation.status,
    userId: automation.userId,
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
    stats,
    steps: automation.steps.map((step) => ({
      id: step.id,
      name: step.name,
      stepType: step.stepType,
      config: step.config,
      nextStepId: step.nextStepId,
      trueStepId: step.trueStepId,
      falseStepId: step.falseStepId,
      positionX: step.positionX,
      positionY: step.positionY,
      sortOrder: step.sortOrder,
    })),
  };
}
