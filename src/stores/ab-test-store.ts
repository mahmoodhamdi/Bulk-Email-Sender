import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ABTestType = 'subject' | 'content' | 'fromName' | 'sendTime';

export type WinnerCriteria = 'openRate' | 'clickRate' | 'conversionRate';

export interface ABVariant {
  id: string;
  name: string;
  subject?: string;
  content?: string;
  fromName?: string;
  sendTime?: Date;
  // Results
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  testType: ABTestType;
  variants: ABVariant[];
  // Configuration
  sampleSize: number; // Percentage of recipients for test (e.g., 20%)
  winnerCriteria: WinnerCriteria;
  testDuration: number; // Hours to run test before selecting winner
  autoSelectWinner: boolean;
  // Status
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  winnerId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

interface ABTestStore {
  // Current test being created/edited
  currentTest: ABTest | null;

  // All tests
  tests: ABTest[];

  // Actions
  createTest: (campaignId: string) => void;
  updateTest: (updates: Partial<ABTest>) => void;
  addVariant: (variant: Omit<ABVariant, 'id' | 'sent' | 'opened' | 'clicked' | 'converted'>) => void;
  updateVariant: (variantId: string, updates: Partial<ABVariant>) => void;
  removeVariant: (variantId: string) => void;
  setWinnerCriteria: (criteria: WinnerCriteria) => void;
  setSampleSize: (size: number) => void;
  setTestDuration: (hours: number) => void;
  setAutoSelectWinner: (auto: boolean) => void;
  selectWinner: (variantId: string) => void;
  startTest: () => void;
  cancelTest: () => void;
  completeTest: () => void;
  saveTest: () => void;
  loadTest: (testId: string) => void;
  deleteTest: (testId: string) => void;
  resetCurrentTest: () => void;

  // Analytics
  calculateWinner: () => ABVariant | null;
  getVariantStats: (variantId: string) => { openRate: number; clickRate: number; conversionRate: number } | null;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyVariant = (name: string): ABVariant => ({
  id: generateId(),
  name,
  sent: 0,
  opened: 0,
  clicked: 0,
  converted: 0,
});

const createEmptyTest = (campaignId: string): ABTest => ({
  id: generateId(),
  campaignId,
  name: 'A/B Test',
  testType: 'subject',
  variants: [
    createEmptyVariant('Variant A'),
    createEmptyVariant('Variant B'),
  ],
  sampleSize: 20,
  winnerCriteria: 'openRate',
  testDuration: 4,
  autoSelectWinner: true,
  status: 'draft',
  winnerId: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
});

export const useABTestStore = create<ABTestStore>()(
  persist(
    (set, get) => ({
      currentTest: null,
      tests: [],

      createTest: (campaignId) => {
        set({ currentTest: createEmptyTest(campaignId) });
      },

      updateTest: (updates) => {
        set((state) => ({
          currentTest: state.currentTest
            ? { ...state.currentTest, ...updates }
            : null,
        }));
      },

      addVariant: (variant) => {
        set((state) => {
          if (!state.currentTest) return state;
          const newVariant: ABVariant = {
            ...variant,
            id: generateId(),
            sent: 0,
            opened: 0,
            clicked: 0,
            converted: 0,
          };
          return {
            currentTest: {
              ...state.currentTest,
              variants: [...state.currentTest.variants, newVariant],
            },
          };
        });
      },

      updateVariant: (variantId, updates) => {
        set((state) => {
          if (!state.currentTest) return state;
          return {
            currentTest: {
              ...state.currentTest,
              variants: state.currentTest.variants.map((v) =>
                v.id === variantId ? { ...v, ...updates } : v
              ),
            },
          };
        });
      },

      removeVariant: (variantId) => {
        set((state) => {
          if (!state.currentTest) return state;
          if (state.currentTest.variants.length <= 2) return state; // Minimum 2 variants
          return {
            currentTest: {
              ...state.currentTest,
              variants: state.currentTest.variants.filter((v) => v.id !== variantId),
            },
          };
        });
      },

      setWinnerCriteria: (criteria) => {
        set((state) => ({
          currentTest: state.currentTest
            ? { ...state.currentTest, winnerCriteria: criteria }
            : null,
        }));
      },

      setSampleSize: (size) => {
        set((state) => ({
          currentTest: state.currentTest
            ? { ...state.currentTest, sampleSize: Math.min(100, Math.max(5, size)) }
            : null,
        }));
      },

      setTestDuration: (hours) => {
        set((state) => ({
          currentTest: state.currentTest
            ? { ...state.currentTest, testDuration: Math.min(168, Math.max(1, hours)) }
            : null,
        }));
      },

      setAutoSelectWinner: (auto) => {
        set((state) => ({
          currentTest: state.currentTest
            ? { ...state.currentTest, autoSelectWinner: auto }
            : null,
        }));
      },

      selectWinner: (variantId) => {
        set((state) => {
          if (!state.currentTest) return state;
          const variant = state.currentTest.variants.find((v) => v.id === variantId);
          if (!variant) return state;
          return {
            currentTest: {
              ...state.currentTest,
              winnerId: variantId,
              status: 'completed',
              completedAt: new Date(),
            },
          };
        });
      },

      startTest: () => {
        set((state) => ({
          currentTest: state.currentTest
            ? {
                ...state.currentTest,
                status: 'running',
                startedAt: new Date(),
              }
            : null,
        }));
      },

      cancelTest: () => {
        set((state) => ({
          currentTest: state.currentTest
            ? { ...state.currentTest, status: 'cancelled' }
            : null,
        }));
      },

      completeTest: () => {
        const { currentTest, calculateWinner } = get();
        if (!currentTest) return;

        const winner = calculateWinner();
        set({
          currentTest: {
            ...currentTest,
            status: 'completed',
            winnerId: winner?.id || null,
            completedAt: new Date(),
          },
        });
      },

      saveTest: () => {
        set((state) => {
          if (!state.currentTest) return state;
          const existingIndex = state.tests.findIndex(
            (t) => t.id === state.currentTest!.id
          );
          const updatedTests =
            existingIndex >= 0
              ? state.tests.map((t, i) =>
                  i === existingIndex ? state.currentTest! : t
                )
              : [...state.tests, state.currentTest!];
          return { tests: updatedTests };
        });
      },

      loadTest: (testId) => {
        const test = get().tests.find((t) => t.id === testId);
        if (test) {
          set({ currentTest: test });
        }
      },

      deleteTest: (testId) => {
        set((state) => ({
          tests: state.tests.filter((t) => t.id !== testId),
          currentTest:
            state.currentTest?.id === testId ? null : state.currentTest,
        }));
      },

      resetCurrentTest: () => {
        set({ currentTest: null });
      },

      calculateWinner: () => {
        const { currentTest } = get();
        if (!currentTest || currentTest.variants.length === 0) return null;

        const { variants, winnerCriteria } = currentTest;

        const getRate = (variant: ABVariant): number => {
          if (variant.sent === 0) return 0;
          switch (winnerCriteria) {
            case 'openRate':
              return variant.opened / variant.sent;
            case 'clickRate':
              return variant.clicked / variant.sent;
            case 'conversionRate':
              return variant.converted / variant.sent;
            default:
              return 0;
          }
        };

        return variants.reduce((best, current) =>
          getRate(current) > getRate(best) ? current : best
        );
      },

      getVariantStats: (variantId) => {
        const { currentTest } = get();
        if (!currentTest) return null;

        const variant = currentTest.variants.find((v) => v.id === variantId);
        if (!variant || variant.sent === 0) {
          return { openRate: 0, clickRate: 0, conversionRate: 0 };
        }

        return {
          openRate: (variant.opened / variant.sent) * 100,
          clickRate: (variant.clicked / variant.sent) * 100,
          conversionRate: (variant.converted / variant.sent) * 100,
        };
      },
    }),
    {
      name: 'ab-test-storage',
      partialize: (state) => ({ tests: state.tests }),
    }
  )
);

export { generateId, createEmptyVariant, createEmptyTest };
