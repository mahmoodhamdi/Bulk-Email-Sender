/**
 * Automation Workflow Module
 * Export all automation-related functionality
 */

// Types and schemas
export {
  // Zod schemas
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
  signupTriggerConfigSchema,
  tagAddedTriggerConfigSchema,
  dateFieldTriggerConfigSchema,
  emailOpenedTriggerConfigSchema,
  linkClickedTriggerConfigSchema,
  formSubmittedTriggerConfigSchema,
  // Types
  type CreateAutomationInput,
  type UpdateAutomationInput,
  type CreateStepInput,
  type UpdateStepInput,
  type EnrollContactInput,
  type EmailStepConfig,
  type DelayStepConfig,
  type ConditionStepConfig,
  type ActionStepConfig,
  type WebhookStepConfig,
  type AutomationStats,
  type StepStats,
  type AutomationWithStats,
  type EnrollmentWithExecutions,
} from './types';

// Service functions
export {
  // Automation CRUD
  createAutomation,
  getAutomation,
  listAutomations,
  updateAutomation,
  deleteAutomation,
  // Automation status
  activateAutomation,
  pauseAutomation,
  archiveAutomation,
  // Step management
  addStep,
  updateStep,
  removeStep,
  reorderSteps,
  // Enrollment management
  enrollContact,
  exitEnrollment,
  completeEnrollment,
  getEnrollment,
  listEnrollments,
  // Step execution
  createStepExecution,
  updateStepExecution,
  getPendingExecutions,
} from './automation-service';
