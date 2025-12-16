/**
 * Automation Workflow Types
 */

import { z } from 'zod';
import type {
  AutomationTriggerType,
  AutomationStatus,
  AutomationStepType,
  EnrollmentStatus,
  StepExecutionStatus,
} from '@prisma/client';

// Step config schemas for each step type
export const emailStepConfigSchema = z.object({
  templateId: z.string().optional(),
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
});

export const delayStepConfigSchema = z.object({
  duration: z.number().int().min(1), // Duration value
  unit: z.enum(['minutes', 'hours', 'days', 'weeks']),
});

export const conditionStepConfigSchema = z.object({
  field: z.string().min(1), // Field to check
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const actionStepConfigSchema = z.object({
  actionType: z.enum(['add_tag', 'remove_tag', 'update_field', 'subscribe_list', 'unsubscribe_list']),
  tag: z.string().optional(),
  field: z.string().optional(),
  fieldValue: z.string().optional(),
  listId: z.string().optional(),
});

export const webhookStepConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

// Union of all step configs
export const stepConfigSchema = z.union([
  emailStepConfigSchema,
  delayStepConfigSchema,
  conditionStepConfigSchema,
  actionStepConfigSchema,
  webhookStepConfigSchema,
]);

// Trigger config schemas
export const signupTriggerConfigSchema = z.object({
  listIds: z.array(z.string()).optional(), // Specific lists to watch
});

export const tagAddedTriggerConfigSchema = z.object({
  tags: z.array(z.string()).min(1), // Tags to watch for
});

export const dateFieldTriggerConfigSchema = z.object({
  field: z.string().min(1), // Field name (e.g., 'birthday')
  daysBefore: z.number().int().min(0).default(0), // Days before the date to trigger
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('09:00'), // Time to send
});

export const emailOpenedTriggerConfigSchema = z.object({
  campaignIds: z.array(z.string()).optional(), // Specific campaigns to watch
});

export const linkClickedTriggerConfigSchema = z.object({
  campaignIds: z.array(z.string()).optional(),
  linkUrl: z.string().optional(), // Specific link URL to watch
});

export const formSubmittedTriggerConfigSchema = z.object({
  formId: z.string().min(1),
});

// Create step input
export const createStepSchema = z.object({
  stepType: z.enum(['EMAIL', 'DELAY', 'CONDITION', 'ACTION', 'WEBHOOK']),
  name: z.string().min(1).max(100),
  config: z.record(z.unknown()),
  nextStepId: z.string().optional(),
  trueStepId: z.string().optional(),
  falseStepId: z.string().optional(),
  positionX: z.number().int().default(0),
  positionY: z.number().int().default(0),
  sortOrder: z.number().int().default(0),
});

// Create automation input
export const createAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  triggerType: z.enum(['SIGNUP', 'TAG_ADDED', 'DATE_FIELD', 'MANUAL', 'EMAIL_OPENED', 'LINK_CLICKED', 'FORM_SUBMITTED']),
  triggerConfig: z.record(z.unknown()).optional(),
  steps: z.array(createStepSchema).optional(),
});

// Update automation input
export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  triggerType: z.enum(['SIGNUP', 'TAG_ADDED', 'DATE_FIELD', 'MANUAL', 'EMAIL_OPENED', 'LINK_CLICKED', 'FORM_SUBMITTED']).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
});

// Update step input
export const updateStepSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.unknown()).optional(),
  nextStepId: z.string().nullable().optional(),
  trueStepId: z.string().nullable().optional(),
  falseStepId: z.string().nullable().optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
});

// Enroll contact input
export const enrollContactSchema = z.object({
  contactId: z.string().min(1),
  startStepId: z.string().optional(), // Optional: start from specific step
});

// TypeScript types
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
export type CreateStepInput = z.infer<typeof createStepSchema>;
export type UpdateStepInput = z.infer<typeof updateStepSchema>;
export type EnrollContactInput = z.infer<typeof enrollContactSchema>;

export type EmailStepConfig = z.infer<typeof emailStepConfigSchema>;
export type DelayStepConfig = z.infer<typeof delayStepConfigSchema>;
export type ConditionStepConfig = z.infer<typeof conditionStepConfigSchema>;
export type ActionStepConfig = z.infer<typeof actionStepConfigSchema>;
export type WebhookStepConfig = z.infer<typeof webhookStepConfigSchema>;

// Stats interfaces
export interface AutomationStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  exitedEnrollments: number;
  failedEnrollments: number;
}

export interface StepStats {
  stepId: string;
  name: string;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  pendingExecutions: number;
}

export interface AutomationWithStats {
  id: string;
  name: string;
  description: string | null;
  triggerType: AutomationTriggerType;
  triggerConfig: unknown;
  status: AutomationStatus;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  stats: AutomationStats;
  steps: Array<{
    id: string;
    name: string;
    stepType: AutomationStepType;
    config: unknown;
    nextStepId: string | null;
    trueStepId: string | null;
    falseStepId: string | null;
    positionX: number;
    positionY: number;
    sortOrder: number;
  }>;
}

export interface EnrollmentWithExecutions {
  id: string;
  automationId: string;
  contactId: string;
  status: EnrollmentStatus;
  currentStepId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  exitedAt: Date | null;
  exitReason: string | null;
  stepExecutions: Array<{
    id: string;
    stepId: string;
    status: StepExecutionStatus;
    result: unknown;
    scheduledAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    error: string | null;
  }>;
}
