import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConditionField =
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'tags'
  | 'status'
  | 'createdAt'
  | 'lastEmailSent'
  | 'lastEmailOpened'
  | 'lastEmailClicked'
  | 'totalEmailsSent'
  | 'openRate'
  | 'clickRate'
  | 'customField1'
  | 'customField2';

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'inLast'
  | 'notInLast'
  | 'before'
  | 'after'
  | 'includes'
  | 'excludes';

export interface SegmentCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | string[];
  secondValue?: string | number; // For 'between' operator
}

export interface SegmentGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: SegmentCondition[];
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  logic: 'AND' | 'OR'; // Logic between groups
  groups: SegmentGroup[];
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SegmentationStore {
  // Current segment being edited
  currentSegment: Segment | null;

  // All saved segments
  segments: Segment[];

  // Preview data
  previewContacts: string[];
  isLoadingPreview: boolean;

  // Actions
  createSegment: () => void;
  updateSegment: (updates: Partial<Segment>) => void;
  addGroup: () => void;
  updateGroup: (groupId: string, updates: Partial<SegmentGroup>) => void;
  removeGroup: (groupId: string) => void;
  addCondition: (groupId: string) => void;
  updateCondition: (groupId: string, conditionId: string, updates: Partial<SegmentCondition>) => void;
  removeCondition: (groupId: string, conditionId: string) => void;
  setGroupLogic: (groupId: string, logic: 'AND' | 'OR') => void;
  setSegmentLogic: (logic: 'AND' | 'OR') => void;
  saveSegment: () => void;
  loadSegment: (segmentId: string) => void;
  deleteSegment: (segmentId: string) => void;
  duplicateSegment: (segmentId: string) => void;
  resetCurrentSegment: () => void;

  // Preview
  refreshPreview: () => void;
  setPreviewContacts: (contacts: string[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createDefaultCondition = (): SegmentCondition => ({
  id: generateId(),
  field: 'email',
  operator: 'contains',
  value: '',
});

const createDefaultGroup = (): SegmentGroup => ({
  id: generateId(),
  logic: 'AND',
  conditions: [createDefaultCondition()],
});

const createDefaultSegment = (): Segment => ({
  id: generateId(),
  name: 'New Segment',
  description: '',
  logic: 'AND',
  groups: [createDefaultGroup()],
  contactCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Field metadata for UI
export const fieldMetadata: Record<ConditionField, {
  label: string;
  type: 'string' | 'number' | 'date' | 'array' | 'percentage';
  operators: ConditionOperator[];
}> = {
  email: {
    label: 'Email',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  },
  firstName: {
    label: 'First Name',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'isEmpty', 'isNotEmpty'],
  },
  lastName: {
    label: 'Last Name',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'isEmpty', 'isNotEmpty'],
  },
  company: {
    label: 'Company',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  },
  tags: {
    label: 'Tags',
    type: 'array',
    operators: ['includes', 'excludes', 'isEmpty', 'isNotEmpty'],
  },
  status: {
    label: 'Status',
    type: 'string',
    operators: ['equals', 'notEquals'],
  },
  createdAt: {
    label: 'Date Added',
    type: 'date',
    operators: ['before', 'after', 'between', 'inLast', 'notInLast'],
  },
  lastEmailSent: {
    label: 'Last Email Sent',
    type: 'date',
    operators: ['before', 'after', 'inLast', 'notInLast', 'isEmpty', 'isNotEmpty'],
  },
  lastEmailOpened: {
    label: 'Last Email Opened',
    type: 'date',
    operators: ['before', 'after', 'inLast', 'notInLast', 'isEmpty', 'isNotEmpty'],
  },
  lastEmailClicked: {
    label: 'Last Email Clicked',
    type: 'date',
    operators: ['before', 'after', 'inLast', 'notInLast', 'isEmpty', 'isNotEmpty'],
  },
  totalEmailsSent: {
    label: 'Total Emails Sent',
    type: 'number',
    operators: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'between'],
  },
  openRate: {
    label: 'Open Rate',
    type: 'percentage',
    operators: ['equals', 'greaterThan', 'lessThan', 'between'],
  },
  clickRate: {
    label: 'Click Rate',
    type: 'percentage',
    operators: ['equals', 'greaterThan', 'lessThan', 'between'],
  },
  customField1: {
    label: 'Custom Field 1',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  },
  customField2: {
    label: 'Custom Field 2',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  },
};

// Operator labels
export const operatorLabels: Record<ConditionOperator, string> = {
  equals: 'equals',
  notEquals: 'does not equal',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  greaterThan: 'is greater than',
  lessThan: 'is less than',
  between: 'is between',
  inLast: 'in the last',
  notInLast: 'not in the last',
  before: 'is before',
  after: 'is after',
  includes: 'includes',
  excludes: 'excludes',
};

export const useSegmentationStore = create<SegmentationStore>()(
  persist(
    (set, get) => ({
      currentSegment: null,
      segments: [],
      previewContacts: [],
      isLoadingPreview: false,

      createSegment: () => {
        set({ currentSegment: createDefaultSegment() });
      },

      updateSegment: (updates) => {
        set((state) => ({
          currentSegment: state.currentSegment
            ? { ...state.currentSegment, ...updates, updatedAt: new Date() }
            : null,
        }));
      },

      addGroup: () => {
        set((state) => {
          if (!state.currentSegment) return state;
          return {
            currentSegment: {
              ...state.currentSegment,
              groups: [...state.currentSegment.groups, createDefaultGroup()],
              updatedAt: new Date(),
            },
          };
        });
      },

      updateGroup: (groupId, updates) => {
        set((state) => {
          if (!state.currentSegment) return state;
          return {
            currentSegment: {
              ...state.currentSegment,
              groups: state.currentSegment.groups.map((g) =>
                g.id === groupId ? { ...g, ...updates } : g
              ),
              updatedAt: new Date(),
            },
          };
        });
      },

      removeGroup: (groupId) => {
        set((state) => {
          if (!state.currentSegment) return state;
          if (state.currentSegment.groups.length <= 1) return state;
          return {
            currentSegment: {
              ...state.currentSegment,
              groups: state.currentSegment.groups.filter((g) => g.id !== groupId),
              updatedAt: new Date(),
            },
          };
        });
      },

      addCondition: (groupId) => {
        set((state) => {
          if (!state.currentSegment) return state;
          return {
            currentSegment: {
              ...state.currentSegment,
              groups: state.currentSegment.groups.map((g) =>
                g.id === groupId
                  ? { ...g, conditions: [...g.conditions, createDefaultCondition()] }
                  : g
              ),
              updatedAt: new Date(),
            },
          };
        });
      },

      updateCondition: (groupId, conditionId, updates) => {
        set((state) => {
          if (!state.currentSegment) return state;
          return {
            currentSegment: {
              ...state.currentSegment,
              groups: state.currentSegment.groups.map((g) =>
                g.id === groupId
                  ? {
                      ...g,
                      conditions: g.conditions.map((c) =>
                        c.id === conditionId ? { ...c, ...updates } : c
                      ),
                    }
                  : g
              ),
              updatedAt: new Date(),
            },
          };
        });
      },

      removeCondition: (groupId, conditionId) => {
        set((state) => {
          if (!state.currentSegment) return state;
          const group = state.currentSegment.groups.find((g) => g.id === groupId);
          if (!group || group.conditions.length <= 1) return state;
          return {
            currentSegment: {
              ...state.currentSegment,
              groups: state.currentSegment.groups.map((g) =>
                g.id === groupId
                  ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }
                  : g
              ),
              updatedAt: new Date(),
            },
          };
        });
      },

      setGroupLogic: (groupId, logic) => {
        get().updateGroup(groupId, { logic });
      },

      setSegmentLogic: (logic) => {
        get().updateSegment({ logic });
      },

      saveSegment: () => {
        set((state) => {
          if (!state.currentSegment) return state;
          const existingIndex = state.segments.findIndex(
            (s) => s.id === state.currentSegment!.id
          );
          const updatedSegments =
            existingIndex >= 0
              ? state.segments.map((s, i) =>
                  i === existingIndex ? state.currentSegment! : s
                )
              : [...state.segments, state.currentSegment!];
          return { segments: updatedSegments };
        });
      },

      loadSegment: (segmentId) => {
        const segment = get().segments.find((s) => s.id === segmentId);
        if (segment) {
          set({ currentSegment: segment });
        }
      },

      deleteSegment: (segmentId) => {
        set((state) => ({
          segments: state.segments.filter((s) => s.id !== segmentId),
          currentSegment:
            state.currentSegment?.id === segmentId ? null : state.currentSegment,
        }));
      },

      duplicateSegment: (segmentId) => {
        const segment = get().segments.find((s) => s.id === segmentId);
        if (segment) {
          const newSegment: Segment = {
            ...segment,
            id: generateId(),
            name: `${segment.name} (Copy)`,
            groups: segment.groups.map((g) => ({
              ...g,
              id: generateId(),
              conditions: g.conditions.map((c) => ({ ...c, id: generateId() })),
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set((state) => ({
            segments: [...state.segments, newSegment],
            currentSegment: newSegment,
          }));
        }
      },

      resetCurrentSegment: () => {
        set({ currentSegment: null, previewContacts: [] });
      },

      refreshPreview: () => {
        // In a real app, this would call an API to get matching contacts
        set({ isLoadingPreview: true });
        // Simulate API call
        setTimeout(() => {
          set({
            isLoadingPreview: false,
            previewContacts: [
              'john@example.com',
              'jane@example.com',
              'bob@example.com',
            ],
          });
        }, 500);
      },

      setPreviewContacts: (contacts) => {
        set({ previewContacts: contacts });
      },
    }),
    {
      name: 'segmentation-storage',
      partialize: (state) => ({ segments: state.segments }),
    }
  )
);

export { generateId, createDefaultCondition, createDefaultGroup, createDefaultSegment };
