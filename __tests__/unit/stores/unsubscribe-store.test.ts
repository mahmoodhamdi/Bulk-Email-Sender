import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useUnsubscribeStore,
  isValidEmail,
  generateId,
  type SuppressedContact,
  type UnsubscribeReason,
  type SuppressionSource,
} from '@/stores/unsubscribe-store';

describe('Unsubscribe Store', () => {
  beforeEach(() => {
    act(() => {
      useUnsubscribeStore.setState({
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
      });
    });
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const state = useUnsubscribeStore.getState();
      expect(state.suppressionList).toEqual([]);
      expect(state.totalCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.reasonFilter).toBe('all');
      expect(state.sourceFilter).toBe('all');
      expect(state.dateRange).toBe('30d');
      expect(state.currentPage).toBe(1);
      expect(state.pageSize).toBe(20);
      expect(state.selectedIds).toEqual([]);
    });
  });

  describe('CRUD Operations', () => {
    it('should add email to suppression list', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'not_interested');
      });

      const state = useUnsubscribeStore.getState();
      expect(state.suppressionList).toHaveLength(1);
      expect(state.suppressionList[0].email).toBe('test@example.com');
      expect(state.suppressionList[0].reason).toBe('not_interested');
      expect(state.suppressionList[0].source).toBe('manual');
    });

    it('should normalize email to lowercase', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('TEST@EXAMPLE.COM', 'too_frequent');
      });

      expect(useUnsubscribeStore.getState().suppressionList[0].email).toBe('test@example.com');
    });

    it('should not add duplicate email', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'not_interested');
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'too_frequent');
      });

      expect(useUnsubscribeStore.getState().suppressionList).toHaveLength(1);
      expect(useUnsubscribeStore.getState().error).toBe('Email already in suppression list');
    });

    it('should not add invalid email', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('invalid-email', 'not_interested');
      });

      expect(useUnsubscribeStore.getState().suppressionList).toHaveLength(0);
      expect(useUnsubscribeStore.getState().error).toBe('Invalid email address');
    });

    it('should add email with custom source and feedback', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'too_frequent', 'link', 'Too many emails');
      });

      const contact = useUnsubscribeStore.getState().suppressionList[0];
      expect(contact.source).toBe('link');
      expect(contact.feedback).toBe('Too many emails');
    });

    it('should remove email from suppression list', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'not_interested');
      });

      const id = useUnsubscribeStore.getState().suppressionList[0].id;

      act(() => {
        useUnsubscribeStore.getState().removeFromSuppression(id);
      });

      expect(useUnsubscribeStore.getState().suppressionList).toHaveLength(0);
    });

    it('should bulk remove emails', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test1@example.com', 'not_interested');
        useUnsubscribeStore.getState().addToSuppression('test2@example.com', 'too_frequent');
        useUnsubscribeStore.getState().addToSuppression('test3@example.com', 'other');
      });

      const ids = useUnsubscribeStore.getState().suppressionList.slice(0, 2).map((c) => c.id);

      act(() => {
        useUnsubscribeStore.getState().bulkRemove(ids);
      });

      expect(useUnsubscribeStore.getState().suppressionList).toHaveLength(1);
    });

    it('should update contact', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'not_interested');
      });

      const id = useUnsubscribeStore.getState().suppressionList[0].id;

      act(() => {
        useUnsubscribeStore.getState().updateContact(id, { reason: 'too_frequent', feedback: 'Updated feedback' });
      });

      const contact = useUnsubscribeStore.getState().suppressionList[0];
      expect(contact.reason).toBe('too_frequent');
      expect(contact.feedback).toBe('Updated feedback');
    });
  });

  describe('Import/Export', () => {
    it('should import valid emails', () => {
      const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];

      act(() => {
        const imported = useUnsubscribeStore.getState().importSuppression(emails, 'other');
        expect(imported).toBe(3);
      });

      expect(useUnsubscribeStore.getState().suppressionList).toHaveLength(3);
    });

    it('should skip invalid emails during import', () => {
      const emails = ['valid@example.com', 'invalid-email', 'another@test.com'];

      act(() => {
        const imported = useUnsubscribeStore.getState().importSuppression(emails);
        expect(imported).toBe(2);
      });

      expect(useUnsubscribeStore.getState().suppressionList).toHaveLength(2);
    });

    it('should skip duplicate emails during import', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('existing@example.com', 'not_interested');
      });

      const emails = ['existing@example.com', 'new@example.com'];

      act(() => {
        const imported = useUnsubscribeStore.getState().importSuppression(emails);
        expect(imported).toBe(1);
      });

      expect(useUnsubscribeStore.getState().suppressionList).toHaveLength(2);
    });

    it('should set source to import for imported emails', () => {
      act(() => {
        useUnsubscribeStore.getState().importSuppression(['test@example.com']);
      });

      expect(useUnsubscribeStore.getState().suppressionList[0].source).toBe('import');
    });

    it('should export to CSV format', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'not_interested', 'link', 'Test feedback');
      });

      const csv = useUnsubscribeStore.getState().exportSuppression();
      expect(csv).toContain('Email,Reason,Source,Campaign,Feedback,Date');
      expect(csv).toContain('test@example.com');
      expect(csv).toContain('not_interested');
      expect(csv).toContain('link');
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      act(() => {
        // Add contacts with different reasons and sources
        useUnsubscribeStore.getState().addToSuppression('user1@example.com', 'not_interested', 'link');
        useUnsubscribeStore.getState().addToSuppression('user2@example.com', 'too_frequent', 'manual');
        useUnsubscribeStore.getState().addToSuppression('user3@example.com', 'not_interested', 'import');
      });
    });

    it('should filter by search query', () => {
      act(() => {
        useUnsubscribeStore.getState().setSearchQuery('user1');
      });

      const filtered = useUnsubscribeStore.getState().getFilteredList();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].email).toBe('user1@example.com');
    });

    it('should filter by reason', () => {
      act(() => {
        useUnsubscribeStore.getState().setReasonFilter('not_interested');
      });

      const filtered = useUnsubscribeStore.getState().getFilteredList();
      expect(filtered).toHaveLength(2);
    });

    it('should filter by source', () => {
      act(() => {
        useUnsubscribeStore.getState().setSourceFilter('link');
      });

      const filtered = useUnsubscribeStore.getState().getFilteredList();
      expect(filtered).toHaveLength(1);
    });

    it('should combine filters', () => {
      act(() => {
        useUnsubscribeStore.getState().setReasonFilter('not_interested');
        useUnsubscribeStore.getState().setSourceFilter('link');
      });

      const filtered = useUnsubscribeStore.getState().getFilteredList();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].email).toBe('user1@example.com');
    });

    it('should clear filters', () => {
      act(() => {
        useUnsubscribeStore.getState().setSearchQuery('test');
        useUnsubscribeStore.getState().setReasonFilter('not_interested');
        useUnsubscribeStore.getState().setSourceFilter('manual');
        useUnsubscribeStore.getState().clearFilters();
      });

      const state = useUnsubscribeStore.getState();
      expect(state.searchQuery).toBe('');
      expect(state.reasonFilter).toBe('all');
      expect(state.sourceFilter).toBe('all');
    });

    it('should reset page on filter change', () => {
      act(() => {
        useUnsubscribeStore.getState().setCurrentPage(5);
        useUnsubscribeStore.getState().setSearchQuery('test');
      });

      expect(useUnsubscribeStore.getState().currentPage).toBe(1);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter by date range', () => {
      // Create contacts with different dates
      const now = new Date();
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const fifteenDaysAgo = new Date(now);
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      act(() => {
        useUnsubscribeStore.setState((state) => ({
          suppressionList: [
            { ...createContact('new@example.com'), suppressedAt: now },
            { ...createContact('week@example.com'), suppressedAt: fiveDaysAgo },
            { ...createContact('old@example.com'), suppressedAt: fifteenDaysAgo },
          ],
          totalCount: 3,
        }));
      });

      act(() => {
        useUnsubscribeStore.getState().setDateRange('7d');
      });

      const filtered = useUnsubscribeStore.getState().getFilteredList();
      expect(filtered).toHaveLength(2);
    });

    it('should handle custom date range', () => {
      const start = new Date();
      start.setDate(start.getDate() - 10);
      const end = new Date();

      act(() => {
        useUnsubscribeStore.getState().setCustomDateRange(start, end);
      });

      const state = useUnsubscribeStore.getState();
      expect(state.dateRange).toBe('custom');
      expect(state.customStartDate).toEqual(start);
      expect(state.customEndDate).toEqual(end);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Add 25 contacts
      act(() => {
        for (let i = 0; i < 25; i++) {
          useUnsubscribeStore.getState().addToSuppression(`user${i}@example.com`, 'not_interested');
        }
      });
    });

    it('should paginate results', () => {
      act(() => {
        useUnsubscribeStore.getState().setPageSize(10);
      });

      const page1 = useUnsubscribeStore.getState().getPaginatedList();
      expect(page1).toHaveLength(10);

      act(() => {
        useUnsubscribeStore.getState().setCurrentPage(2);
      });

      const page2 = useUnsubscribeStore.getState().getPaginatedList();
      expect(page2).toHaveLength(10);

      act(() => {
        useUnsubscribeStore.getState().setCurrentPage(3);
      });

      const page3 = useUnsubscribeStore.getState().getPaginatedList();
      expect(page3).toHaveLength(5);
    });

    it('should reset page on page size change', () => {
      act(() => {
        useUnsubscribeStore.getState().setCurrentPage(3);
        useUnsubscribeStore.getState().setPageSize(50);
      });

      expect(useUnsubscribeStore.getState().currentPage).toBe(1);
    });
  });

  describe('Selection', () => {
    beforeEach(() => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test1@example.com', 'not_interested');
        useUnsubscribeStore.getState().addToSuppression('test2@example.com', 'too_frequent');
        useUnsubscribeStore.getState().addToSuppression('test3@example.com', 'other');
      });
    });

    it('should toggle selection', () => {
      const id = useUnsubscribeStore.getState().suppressionList[0].id;

      act(() => {
        useUnsubscribeStore.getState().toggleSelection(id);
      });

      expect(useUnsubscribeStore.getState().selectedIds).toContain(id);

      act(() => {
        useUnsubscribeStore.getState().toggleSelection(id);
      });

      expect(useUnsubscribeStore.getState().selectedIds).not.toContain(id);
    });

    it('should select all', () => {
      act(() => {
        useUnsubscribeStore.getState().selectAll();
      });

      expect(useUnsubscribeStore.getState().selectedIds).toHaveLength(3);
    });

    it('should clear selection', () => {
      act(() => {
        useUnsubscribeStore.getState().selectAll();
        useUnsubscribeStore.getState().clearSelection();
      });

      expect(useUnsubscribeStore.getState().selectedIds).toHaveLength(0);
    });

    it('should clear selection on bulk remove', () => {
      act(() => {
        useUnsubscribeStore.getState().selectAll();
      });

      const ids = useUnsubscribeStore.getState().selectedIds;

      act(() => {
        useUnsubscribeStore.getState().bulkRemove(ids);
      });

      expect(useUnsubscribeStore.getState().selectedIds).toHaveLength(0);
    });
  });

  describe('Stats Calculation', () => {
    it('should calculate stats correctly', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test1@example.com', 'not_interested', 'link');
        useUnsubscribeStore.getState().addToSuppression('test2@example.com', 'not_interested', 'manual');
        useUnsubscribeStore.getState().addToSuppression('test3@example.com', 'too_frequent', 'complaint');
      });

      const stats = useUnsubscribeStore.getState().stats;
      expect(stats.totalSuppressed).toBe(3);
      expect(stats.byReason.not_interested).toBe(2);
      expect(stats.byReason.too_frequent).toBe(1);
      expect(stats.bySource.link).toBe(1);
      expect(stats.bySource.manual).toBe(1);
      expect(stats.bySource.complaint).toBe(1);
    });

    it('should refresh stats', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'not_interested');
      });

      act(() => {
        useUnsubscribeStore.getState().refreshStats();
      });

      expect(useUnsubscribeStore.getState().stats.totalSuppressed).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    it('should check if email is suppressed', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('test@example.com', 'not_interested');
      });

      expect(useUnsubscribeStore.getState().isEmailSuppressed('test@example.com')).toBe(true);
      expect(useUnsubscribeStore.getState().isEmailSuppressed('TEST@EXAMPLE.COM')).toBe(true);
      expect(useUnsubscribeStore.getState().isEmailSuppressed('other@example.com')).toBe(false);
    });

    it('should clear error', () => {
      act(() => {
        useUnsubscribeStore.setState({ error: 'Test error' });
        useUnsubscribeStore.getState().clearError();
      });

      expect(useUnsubscribeStore.getState().error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should load suppression list', async () => {
      await act(async () => {
        await useUnsubscribeStore.getState().loadSuppressionList();
      });

      const state = useUnsubscribeStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.suppressionList.length).toBeGreaterThan(0);
      expect(state.stats.totalSuppressed).toBeGreaterThan(0);
    });
  });
});

describe('Helper Functions', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@gmail.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^sup_\d+_\w+$/);
    });
  });
});

// Helper function
function createContact(email: string): SuppressedContact {
  return {
    id: generateId(),
    email,
    reason: 'not_interested',
    source: 'manual',
    suppressedAt: new Date(),
  };
}
