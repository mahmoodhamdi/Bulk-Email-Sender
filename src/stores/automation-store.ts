'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateShortId } from '@/lib/crypto';

// Types
export type TriggerType = 'signup' | 'tag_added' | 'date_field' | 'manual' | 'email_opened' | 'link_clicked';
export type StepType = 'email' | 'delay' | 'condition' | 'action';
export type AutomationStatus = 'draft' | 'active' | 'paused';
export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export type ActionType = 'add_tag' | 'remove_tag' | 'update_field' | 'add_to_segment' | 'webhook';
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists' | 'opened' | 'clicked';

// Trigger configurations
export interface TriggerConfig {
  type: TriggerType;
  tagId?: string;
  dateField?: string;
  emailId?: string;
  linkUrl?: string;
}

// Step configurations
export interface EmailStepConfig {
  templateId: string;
  templateName?: string;
  subject: string;
  fromName?: string;
  fromEmail?: string;
}

export interface DelayStepConfig {
  duration: number;
  unit: DelayUnit;
}

export interface ConditionStepConfig {
  field: string;
  operator: ConditionOperator;
  value?: string;
}

export interface ActionStepConfig {
  action: ActionType;
  target: string;
  value?: string;
}

export type StepConfig = EmailStepConfig | DelayStepConfig | ConditionStepConfig | ActionStepConfig;

// Step interface
export interface AutomationStep {
  id: string;
  type: StepType;
  name: string;
  config: StepConfig;
  nextStepId?: string;
  trueStepId?: string;  // For conditions
  falseStepId?: string; // For conditions
  position: { x: number; y: number };
}

// Stats interface
export interface AutomationStats {
  totalEntered: number;
  totalCompleted: number;
  totalActive: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
}

// Automation interface
export interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerConfig;
  steps: AutomationStep[];
  status: AutomationStatus;
  createdAt: Date;
  updatedAt: Date;
  stats: AutomationStats;
}

// Store state
interface AutomationState {
  automations: Automation[];
  currentAutomation: Automation | null;
  selectedStepId: string | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  statusFilter: AutomationStatus | 'all';
  searchQuery: string;
}

// Store actions
interface AutomationActions {
  // CRUD operations
  loadAutomations: () => Promise<void>;
  createAutomation: (name: string, description?: string) => string;
  updateAutomation: (id: string, updates: Partial<Automation>) => void;
  deleteAutomation: (id: string) => void;
  duplicateAutomation: (id: string) => string;

  // Current automation
  loadAutomation: (id: string) => void;
  clearCurrentAutomation: () => void;

  // Status management
  activateAutomation: (id: string) => void;
  pauseAutomation: (id: string) => void;

  // Trigger management
  setTrigger: (trigger: TriggerConfig) => void;

  // Step management
  addStep: (type: StepType, afterStepId?: string) => string;
  updateStep: (stepId: string, updates: Partial<AutomationStep>) => void;
  deleteStep: (stepId: string) => void;
  moveStep: (stepId: string, position: { x: number; y: number }) => void;
  connectSteps: (fromId: string, toId: string, branch?: 'true' | 'false') => void;
  disconnectSteps: (fromId: string, branch?: 'true' | 'false') => void;
  selectStep: (stepId: string | null) => void;

  // Filtering
  setStatusFilter: (status: AutomationStatus | 'all') => void;
  setSearchQuery: (query: string) => void;

  // Computed
  getFilteredAutomations: () => Automation[];
  getStepById: (stepId: string) => AutomationStep | undefined;

  // Error handling
  clearError: () => void;
}

// Generate unique ID using crypto API
function generateId(): string {
  return `auto_${generateShortId(12)}`;
}

function generateStepId(): string {
  return `step_${generateShortId(12)}`;
}

/**
 * Detect cycles in workflow connections to prevent infinite loops
 */
function detectCycle(steps: AutomationStep[], fromId: string, toId: string): boolean {
  const visited = new Set<string>();
  const stack = [toId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === fromId) return true; // Cycle detected
    if (visited.has(current)) continue;
    visited.add(current);

    const step = steps.find((s) => s.id === current);
    if (step?.nextStepId) stack.push(step.nextStepId);
    if (step?.trueStepId) stack.push(step.trueStepId);
    if (step?.falseStepId) stack.push(step.falseStepId);
  }
  return false;
}

// Default step configs
function getDefaultStepConfig(type: StepType): StepConfig {
  switch (type) {
    case 'email':
      return {
        templateId: '',
        subject: '',
      } as EmailStepConfig;
    case 'delay':
      return {
        duration: 1,
        unit: 'days',
      } as DelayStepConfig;
    case 'condition':
      return {
        field: 'email_opened',
        operator: 'equals',
        value: 'true',
      } as ConditionStepConfig;
    case 'action':
      return {
        action: 'add_tag',
        target: '',
      } as ActionStepConfig;
  }
}

// Default step names
function getDefaultStepName(type: StepType): string {
  switch (type) {
    case 'email':
      return 'Send Email';
    case 'delay':
      return 'Wait';
    case 'condition':
      return 'If/Else';
    case 'action':
      return 'Action';
  }
}

// Generate mock automations
function generateMockAutomations(): Automation[] {
  const now = new Date();

  return [
    {
      id: generateId(),
      name: 'Welcome Series',
      description: 'Automated welcome emails for new subscribers',
      trigger: { type: 'signup' },
      steps: [
        {
          id: generateStepId(),
          type: 'email',
          name: 'Welcome Email',
          config: {
            templateId: 'tpl_welcome',
            templateName: 'Welcome Template',
            subject: 'Welcome to our community!',
          } as EmailStepConfig,
          position: { x: 100, y: 100 },
          nextStepId: 'step_delay_1',
        },
        {
          id: 'step_delay_1',
          type: 'delay',
          name: 'Wait 3 days',
          config: {
            duration: 3,
            unit: 'days',
          } as DelayStepConfig,
          position: { x: 100, y: 200 },
          nextStepId: 'step_email_2',
        },
        {
          id: 'step_email_2',
          type: 'email',
          name: 'Getting Started',
          config: {
            templateId: 'tpl_getting_started',
            templateName: 'Getting Started Guide',
            subject: 'Get the most out of your account',
          } as EmailStepConfig,
          position: { x: 100, y: 300 },
        },
      ],
      status: 'active',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      stats: {
        totalEntered: 1250,
        totalCompleted: 980,
        totalActive: 145,
        emailsSent: 3450,
        openRate: 42.5,
        clickRate: 12.3,
      },
    },
    {
      id: generateId(),
      name: 'Re-engagement Campaign',
      description: 'Win back inactive subscribers',
      trigger: { type: 'manual' },
      steps: [
        {
          id: generateStepId(),
          type: 'email',
          name: 'We Miss You',
          config: {
            templateId: 'tpl_miss_you',
            templateName: 'Re-engagement Email',
            subject: "We haven't heard from you in a while",
          } as EmailStepConfig,
          position: { x: 100, y: 100 },
          nextStepId: 'step_condition_1',
        },
        {
          id: 'step_condition_1',
          type: 'condition',
          name: 'Opened email?',
          config: {
            field: 'email_opened',
            operator: 'equals',
            value: 'true',
          } as ConditionStepConfig,
          position: { x: 100, y: 200 },
          trueStepId: 'step_email_offer',
          falseStepId: 'step_action_remove',
        },
        {
          id: 'step_email_offer',
          type: 'email',
          name: 'Special Offer',
          config: {
            templateId: 'tpl_offer',
            templateName: 'Special Offer',
            subject: 'A special offer just for you!',
          } as EmailStepConfig,
          position: { x: 0, y: 300 },
        },
        {
          id: 'step_action_remove',
          type: 'action',
          name: 'Remove from list',
          config: {
            action: 'remove_tag',
            target: 'active_subscriber',
          } as ActionStepConfig,
          position: { x: 200, y: 300 },
        },
      ],
      status: 'paused',
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      stats: {
        totalEntered: 450,
        totalCompleted: 380,
        totalActive: 0,
        emailsSent: 820,
        openRate: 28.5,
        clickRate: 8.2,
      },
    },
    {
      id: generateId(),
      name: 'Birthday Wishes',
      description: 'Send birthday greetings with special offers',
      trigger: { type: 'date_field', dateField: 'birthday' },
      steps: [
        {
          id: generateStepId(),
          type: 'email',
          name: 'Happy Birthday!',
          config: {
            templateId: 'tpl_birthday',
            templateName: 'Birthday Email',
            subject: 'Happy Birthday, {{firstName}}! 🎂',
          } as EmailStepConfig,
          position: { x: 100, y: 100 },
        },
      ],
      status: 'active',
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      stats: {
        totalEntered: 125,
        totalCompleted: 125,
        totalActive: 0,
        emailsSent: 125,
        openRate: 68.0,
        clickRate: 25.6,
      },
    },
  ];
}

// Initial state
const initialState: AutomationState = {
  automations: [],
  currentAutomation: null,
  selectedStepId: null,
  isLoading: false,
  error: null,
  statusFilter: 'all',
  searchQuery: '',
};

// Initial stats
const initialStats: AutomationStats = {
  totalEntered: 0,
  totalCompleted: 0,
  totalActive: 0,
  emailsSent: 0,
  openRate: 0,
  clickRate: 0,
};

// Create store
export const useAutomationStore = create<AutomationState & AutomationActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // CRUD operations
      loadAutomations: async () => {
        set({ isLoading: true, error: null });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockData = generateMockAutomations();

        set({
          automations: mockData,
          isLoading: false,
        });
      },

      createAutomation: (name, description) => {
        const newAutomation: Automation = {
          id: generateId(),
          name,
          description,
          trigger: { type: 'signup' },
          steps: [],
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          stats: initialStats,
        };

        set((state) => ({
          automations: [...state.automations, newAutomation],
          currentAutomation: newAutomation,
        }));

        return newAutomation.id;
      },

      updateAutomation: (id, updates) => {
        set((state) => {
          const automations = state.automations.map((auto) =>
            auto.id === id
              ? { ...auto, ...updates, updatedAt: new Date() }
              : auto
          );
          const currentAutomation =
            state.currentAutomation?.id === id
              ? { ...state.currentAutomation, ...updates, updatedAt: new Date() }
              : state.currentAutomation;

          return { automations, currentAutomation };
        });
      },

      deleteAutomation: (id) => {
        set((state) => ({
          automations: state.automations.filter((auto) => auto.id !== id),
          currentAutomation:
            state.currentAutomation?.id === id ? null : state.currentAutomation,
        }));
      },

      duplicateAutomation: (id) => {
        const automation = get().automations.find((auto) => auto.id === id);
        if (!automation) return '';

        const newId = generateId();
        const newAutomation: Automation = {
          ...automation,
          id: newId,
          name: `${automation.name} (Copy)`,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          stats: initialStats,
          steps: automation.steps.map((step) => ({
            ...step,
            id: generateStepId(),
          })),
        };

        set((state) => ({
          automations: [...state.automations, newAutomation],
        }));

        return newId;
      },

      // Current automation
      loadAutomation: (id) => {
        const automation = get().automations.find((auto) => auto.id === id);
        set({ currentAutomation: automation || null, selectedStepId: null });
      },

      clearCurrentAutomation: () => {
        set({ currentAutomation: null, selectedStepId: null });
      },

      // Status management
      activateAutomation: (id) => {
        get().updateAutomation(id, { status: 'active' });
      },

      pauseAutomation: (id) => {
        get().updateAutomation(id, { status: 'paused' });
      },

      // Trigger management
      setTrigger: (trigger) => {
        if (!get().currentAutomation) return;

        set((state) => ({
          currentAutomation: state.currentAutomation
            ? { ...state.currentAutomation, trigger, updatedAt: new Date() }
            : null,
        }));

        // Also update in automations array
        const currentId = get().currentAutomation?.id;
        if (currentId) {
          get().updateAutomation(currentId, { trigger });
        }
      },

      // Step management
      addStep: (type, afterStepId) => {
        if (!get().currentAutomation) return '';

        const newStep: AutomationStep = {
          id: generateStepId(),
          type,
          name: getDefaultStepName(type),
          config: getDefaultStepConfig(type),
          position: { x: 100, y: (get().currentAutomation!.steps.length + 1) * 100 },
        };

        set((state) => {
          if (!state.currentAutomation) return state;

          const steps = [...state.currentAutomation.steps, newStep];

          // Connect to previous step if specified
          if (afterStepId) {
            const afterIndex = steps.findIndex((s) => s.id === afterStepId);
            if (afterIndex !== -1) {
              steps[afterIndex] = {
                ...steps[afterIndex],
                nextStepId: newStep.id,
              };
            }
          }

          const updatedAutomation = {
            ...state.currentAutomation,
            steps,
            updatedAt: new Date(),
          };

          return {
            currentAutomation: updatedAutomation,
            automations: state.automations.map((auto) =>
              auto.id === updatedAutomation.id ? updatedAutomation : auto
            ),
            selectedStepId: newStep.id,
          };
        });

        return newStep.id;
      },

      updateStep: (stepId, updates) => {
        set((state) => {
          if (!state.currentAutomation) return state;

          const steps = state.currentAutomation.steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          );

          const updatedAutomation = {
            ...state.currentAutomation,
            steps,
            updatedAt: new Date(),
          };

          return {
            currentAutomation: updatedAutomation,
            automations: state.automations.map((auto) =>
              auto.id === updatedAutomation.id ? updatedAutomation : auto
            ),
          };
        });
      },

      deleteStep: (stepId) => {
        set((state) => {
          if (!state.currentAutomation) return state;

          // Remove connections to this step
          const steps = state.currentAutomation.steps
            .filter((step) => step.id !== stepId)
            .map((step) => ({
              ...step,
              nextStepId: step.nextStepId === stepId ? undefined : step.nextStepId,
              trueStepId: step.trueStepId === stepId ? undefined : step.trueStepId,
              falseStepId: step.falseStepId === stepId ? undefined : step.falseStepId,
            }));

          const updatedAutomation = {
            ...state.currentAutomation,
            steps,
            updatedAt: new Date(),
          };

          return {
            currentAutomation: updatedAutomation,
            automations: state.automations.map((auto) =>
              auto.id === updatedAutomation.id ? updatedAutomation : auto
            ),
            selectedStepId:
              state.selectedStepId === stepId ? null : state.selectedStepId,
          };
        });
      },

      moveStep: (stepId, position) => {
        get().updateStep(stepId, { position });
      },

      connectSteps: (fromId, toId, branch) => {
        set((state) => {
          if (!state.currentAutomation) return state;

          // Check for cycles before connecting
          if (detectCycle(state.currentAutomation.steps, fromId, toId)) {
            console.error('Circular workflow detected - connection blocked');
            return {
              ...state,
              error: 'Cannot create connection: this would create a circular workflow',
            };
          }

          const steps = state.currentAutomation.steps.map((step) => {
            if (step.id !== fromId) return step;

            if (branch === 'true') {
              return { ...step, trueStepId: toId };
            } else if (branch === 'false') {
              return { ...step, falseStepId: toId };
            } else {
              return { ...step, nextStepId: toId };
            }
          });

          const updatedAutomation = {
            ...state.currentAutomation,
            steps,
            updatedAt: new Date(),
          };

          return {
            currentAutomation: updatedAutomation,
            automations: state.automations.map((auto) =>
              auto.id === updatedAutomation.id ? updatedAutomation : auto
            ),
          };
        });
      },

      disconnectSteps: (fromId, branch) => {
        set((state) => {
          if (!state.currentAutomation) return state;

          const steps = state.currentAutomation.steps.map((step) => {
            if (step.id !== fromId) return step;

            if (branch === 'true') {
              return { ...step, trueStepId: undefined };
            } else if (branch === 'false') {
              return { ...step, falseStepId: undefined };
            } else {
              return { ...step, nextStepId: undefined };
            }
          });

          const updatedAutomation = {
            ...state.currentAutomation,
            steps,
            updatedAt: new Date(),
          };

          return {
            currentAutomation: updatedAutomation,
            automations: state.automations.map((auto) =>
              auto.id === updatedAutomation.id ? updatedAutomation : auto
            ),
          };
        });
      },

      selectStep: (stepId) => {
        set({ selectedStepId: stepId });
      },

      // Filtering
      setStatusFilter: (status) => {
        set({ statusFilter: status });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      // Computed
      getFilteredAutomations: () => {
        const state = get();
        let filtered = [...state.automations];

        // Status filter
        if (state.statusFilter !== 'all') {
          filtered = filtered.filter((auto) => auto.status === state.statusFilter);
        }

        // Search filter
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (auto) =>
              auto.name.toLowerCase().includes(query) ||
              auto.description?.toLowerCase().includes(query)
          );
        }

        // Sort by updated date (newest first)
        filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return filtered;
      },

      getStepById: (stepId) => {
        const current = get().currentAutomation;
        if (!current) return undefined;
        return current.steps.find((step) => step.id === stepId);
      },

      // Error handling
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'automation-storage',
      partialize: (state) => ({
        automations: state.automations.map((auto) => ({
          ...auto,
          createdAt: auto.createdAt.toISOString(),
          updatedAt: auto.updatedAt.toISOString(),
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert date strings back to Date objects
          state.automations = state.automations.map((auto) => ({
            ...auto,
            createdAt: new Date(auto.createdAt),
            updatedAt: new Date(auto.updatedAt),
          }));
        }
      },
    }
  )
);

// Export helpers
export { generateId, generateStepId };
