'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type UnsubscribeReason =
  | 'not_interested'
  | 'too_frequent'
  | 'never_subscribed'
  | 'inappropriate_content'
  | 'other';

export type SuppressionSource = 'manual' | 'link' | 'import' | 'bounce' | 'complaint';

export interface SuppressedContact {
  id: string;
  email: string;
  reason: UnsubscribeReason;
  feedback?: string;
  campaignId?: string;
  campaignName?: string;
  source: SuppressionSource;
  suppressedAt: Date;
}

export interface UnsubscribeStats {
  totalSuppressed: number;
  last7Days: number;
  last30Days: number;
  byReason: Record<UnsubscribeReason, number>;
  bySource: Record<SuppressionSource, number>;
  trend: number; // percentage change from previous period
}

export type DateRangeFilter = '7d' | '30d' | '90d' | 'all' | 'custom';

interface UnsubscribeState {
  // Suppression list
  suppressionList: SuppressedContact[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  reasonFilter: UnsubscribeReason | 'all';
  sourceFilter: SuppressionSource | 'all';
  dateRange: DateRangeFilter;
  customStartDate: Date | null;
  customEndDate: Date | null;

  // Stats
  stats: UnsubscribeStats;

  // Pagination
  currentPage: number;
  pageSize: number;

  // Selection
  selectedIds: string[];
}

interface UnsubscribeActions {
  // Data loading
  loadSuppressionList: () => Promise<void>;
  refreshStats: () => void;

  // CRUD operations
  addToSuppression: (email: string, reason: UnsubscribeReason, source?: SuppressionSource, feedback?: string) => void;
  removeFromSuppression: (id: string) => void;
  bulkRemove: (ids: string[]) => void;
  updateContact: (id: string, updates: Partial<SuppressedContact>) => void;

  // Import/Export
  importSuppression: (emails: string[], reason?: UnsubscribeReason) => number;
  exportSuppression: () => string;

  // Filtering
  setSearchQuery: (query: string) => void;
  setReasonFilter: (reason: UnsubscribeReason | 'all') => void;
  setSourceFilter: (source: SuppressionSource | 'all') => void;
  setDateRange: (range: DateRangeFilter) => void;
  setCustomDateRange: (start: Date, end: Date) => void;
  clearFilters: () => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Selection
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Computed
  getFilteredList: () => SuppressedContact[];
  getPaginatedList: () => SuppressedContact[];
  isEmailSuppressed: (email: string) => boolean;

  // Error handling
  clearError: () => void;
}

// Generate unique ID
function generateId(): string {
  return `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate email
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Generate mock data for demo
function generateMockData(): SuppressedContact[] {
  const reasons: UnsubscribeReason[] = ['not_interested', 'too_frequent', 'never_subscribed', 'inappropriate_content', 'other'];
  const sources: SuppressionSource[] = ['link', 'manual', 'import', 'bounce', 'complaint'];
  const campaigns = ['Summer Sale', 'Newsletter Q4', 'Product Launch', 'Holiday Special', null];

  const contacts: SuppressedContact[] = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];

    contacts.push({
      id: generateId(),
      email: `user${i + 1}@example.com`,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      campaignId: campaign ? `camp_${i}` : undefined,
      campaignName: campaign || undefined,
      feedback: Math.random() > 0.7 ? 'Too many emails' : undefined,
      suppressedAt: date,
    });
  }

  return contacts.sort((a, b) => b.suppressedAt.getTime() - a.suppressedAt.getTime());
}

// Calculate stats from suppression list
function calculateStats(list: SuppressedContact[]): UnsubscribeStats {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const last7Days = list.filter((c) => c.suppressedAt >= sevenDaysAgo).length;
  const last30Days = list.filter((c) => c.suppressedAt >= thirtyDaysAgo).length;
  const previous30Days = list.filter(
    (c) => c.suppressedAt >= sixtyDaysAgo && c.suppressedAt < thirtyDaysAgo
  ).length;

  const trend = previous30Days > 0 ? ((last30Days - previous30Days) / previous30Days) * 100 : 0;

  const byReason: Record<UnsubscribeReason, number> = {
    not_interested: 0,
    too_frequent: 0,
    never_subscribed: 0,
    inappropriate_content: 0,
    other: 0,
  };

  const bySource: Record<SuppressionSource, number> = {
    manual: 0,
    link: 0,
    import: 0,
    bounce: 0,
    complaint: 0,
  };

  list.forEach((contact) => {
    byReason[contact.reason]++;
    bySource[contact.source]++;
  });

  return {
    totalSuppressed: list.length,
    last7Days,
    last30Days,
    byReason,
    bySource,
    trend,
  };
}

// Initial state
const initialState: UnsubscribeState = {
  suppressionList: [],
  totalCount: 0,
  isLoading: false,
  error: null,
  searchQuery: '',
  reasonFilter: 'all',
  sourceFilter: 'all',
  dateRange: '30d',
  customStartDate: null,
  customEndDate: null,
  stats: {
    totalSuppressed: 0,
    last7Days: 0,
    last30Days: 0,
    byReason: {
      not_interested: 0,
      too_frequent: 0,
      never_subscribed: 0,
      inappropriate_content: 0,
      other: 0,
    },
    bySource: {
      manual: 0,
      link: 0,
      import: 0,
      bounce: 0,
      complaint: 0,
    },
    trend: 0,
  },
  currentPage: 1,
  pageSize: 20,
  selectedIds: [],
};

// Create store
export const useUnsubscribeStore = create<UnsubscribeState & UnsubscribeActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Data loading
      loadSuppressionList: async () => {
        set({ isLoading: true, error: null });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockData = generateMockData();
        const stats = calculateStats(mockData);

        set({
          suppressionList: mockData,
          totalCount: mockData.length,
          stats,
          isLoading: false,
        });
      },

      refreshStats: () => {
        const stats = calculateStats(get().suppressionList);
        set({ stats });
      },

      // CRUD operations
      addToSuppression: (email, reason, source = 'manual', feedback) => {
        const normalizedEmail = email.toLowerCase().trim();

        if (!isValidEmail(normalizedEmail)) {
          set({ error: 'Invalid email address' });
          return;
        }

        // Check if already exists
        if (get().suppressionList.some((c) => c.email.toLowerCase() === normalizedEmail)) {
          set({ error: 'Email already in suppression list' });
          return;
        }

        const newContact: SuppressedContact = {
          id: generateId(),
          email: normalizedEmail,
          reason,
          source,
          feedback,
          suppressedAt: new Date(),
        };

        set((state) => {
          const newList = [newContact, ...state.suppressionList];
          return {
            suppressionList: newList,
            totalCount: newList.length,
            stats: calculateStats(newList),
            error: null,
          };
        });
      },

      removeFromSuppression: (id) => {
        set((state) => {
          const newList = state.suppressionList.filter((c) => c.id !== id);
          return {
            suppressionList: newList,
            totalCount: newList.length,
            stats: calculateStats(newList),
            selectedIds: state.selectedIds.filter((sid) => sid !== id),
          };
        });
      },

      bulkRemove: (ids) => {
        set((state) => {
          const newList = state.suppressionList.filter((c) => !ids.includes(c.id));
          return {
            suppressionList: newList,
            totalCount: newList.length,
            stats: calculateStats(newList),
            selectedIds: [],
          };
        });
      },

      updateContact: (id, updates) => {
        set((state) => {
          const newList = state.suppressionList.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          );
          return {
            suppressionList: newList,
            stats: calculateStats(newList),
          };
        });
      },

      // Import/Export
      importSuppression: (emails, reason = 'other') => {
        const existingEmails = new Set(get().suppressionList.map((c) => c.email.toLowerCase()));
        let imported = 0;

        const newContacts: SuppressedContact[] = [];

        emails.forEach((email) => {
          const normalizedEmail = email.toLowerCase().trim();
          if (isValidEmail(normalizedEmail) && !existingEmails.has(normalizedEmail)) {
            newContacts.push({
              id: generateId(),
              email: normalizedEmail,
              reason,
              source: 'import',
              suppressedAt: new Date(),
            });
            existingEmails.add(normalizedEmail);
            imported++;
          }
        });

        if (newContacts.length > 0) {
          set((state) => {
            const newList = [...newContacts, ...state.suppressionList];
            return {
              suppressionList: newList,
              totalCount: newList.length,
              stats: calculateStats(newList),
            };
          });
        }

        return imported;
      },

      exportSuppression: () => {
        const list = get().getFilteredList();
        const headers = ['Email', 'Reason', 'Source', 'Campaign', 'Feedback', 'Date'];
        const rows = list.map((c) => [
          c.email,
          c.reason,
          c.source,
          c.campaignName || '',
          c.feedback || '',
          c.suppressedAt.toISOString(),
        ]);

        return [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
      },

      // Filtering
      setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
      setReasonFilter: (reason) => set({ reasonFilter: reason, currentPage: 1 }),
      setSourceFilter: (source) => set({ sourceFilter: source, currentPage: 1 }),
      setDateRange: (range) => set({ dateRange: range, currentPage: 1 }),
      setCustomDateRange: (start, end) =>
        set({
          dateRange: 'custom',
          customStartDate: start,
          customEndDate: end,
          currentPage: 1,
        }),
      clearFilters: () =>
        set({
          searchQuery: '',
          reasonFilter: 'all',
          sourceFilter: 'all',
          dateRange: '30d',
          customStartDate: null,
          customEndDate: null,
          currentPage: 1,
        }),

      // Pagination
      setCurrentPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

      // Selection
      toggleSelection: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        })),
      selectAll: () => {
        const filtered = get().getFilteredList();
        set({ selectedIds: filtered.map((c) => c.id) });
      },
      clearSelection: () => set({ selectedIds: [] }),

      // Computed
      getFilteredList: () => {
        const state = get();
        let filtered = [...state.suppressionList];

        // Search filter
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.email.toLowerCase().includes(query) ||
              c.campaignName?.toLowerCase().includes(query) ||
              c.feedback?.toLowerCase().includes(query)
          );
        }

        // Reason filter
        if (state.reasonFilter !== 'all') {
          filtered = filtered.filter((c) => c.reason === state.reasonFilter);
        }

        // Source filter
        if (state.sourceFilter !== 'all') {
          filtered = filtered.filter((c) => c.source === state.sourceFilter);
        }

        // Date range filter
        const now = new Date();
        let startDate: Date | null = null;

        switch (state.dateRange) {
          case '7d':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            break;
          case '90d':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 90);
            break;
          case 'custom':
            startDate = state.customStartDate;
            break;
        }

        if (startDate) {
          filtered = filtered.filter((c) => c.suppressedAt >= startDate!);
        }

        if (state.dateRange === 'custom' && state.customEndDate) {
          filtered = filtered.filter((c) => c.suppressedAt <= state.customEndDate!);
        }

        return filtered;
      },

      getPaginatedList: () => {
        const state = get();
        const filtered = get().getFilteredList();
        const start = (state.currentPage - 1) * state.pageSize;
        return filtered.slice(start, start + state.pageSize);
      },

      isEmailSuppressed: (email) => {
        const normalizedEmail = email.toLowerCase().trim();
        return get().suppressionList.some((c) => c.email.toLowerCase() === normalizedEmail);
      },

      // Error handling
      clearError: () => set({ error: null }),
    }),
    {
      name: 'unsubscribe-storage',
      partialize: (state) => ({
        suppressionList: state.suppressionList.map((c) => ({
          ...c,
          suppressedAt: c.suppressedAt.toISOString(),
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert date strings back to Date objects
          state.suppressionList = state.suppressionList.map((c) => ({
            ...c,
            suppressedAt: new Date(c.suppressedAt),
          }));
          state.stats = calculateStats(state.suppressionList);
        }
      },
    }
  )
);

// Export helpers
export { isValidEmail, generateId };
