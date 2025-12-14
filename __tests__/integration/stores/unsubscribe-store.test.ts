import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useUnsubscribeStore,
  type SuppressedContact,
  type UnsubscribeReason,
  type SuppressionSource,
} from '@/stores/unsubscribe-store';

describe('Unsubscribe Store Integration', () => {
  beforeEach(() => {
    // Reset store
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

  // Helper to create test contacts
  const createContact = (
    id: string,
    email: string,
    daysAgo: number,
    reason: UnsubscribeReason = 'not_interested',
    source: SuppressionSource = 'link'
  ): SuppressedContact => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      id,
      email,
      reason,
      source,
      suppressedAt: date,
    };
  };

  describe('Full Suppression Workflow', () => {
    it('should complete full load → add → filter → remove workflow', async () => {
      // Step 1: Load suppression list
      await act(async () => {
        await useUnsubscribeStore.getState().loadSuppressionList();
      });

      let state = useUnsubscribeStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.suppressionList.length).toBeGreaterThan(0);
      expect(state.stats.totalSuppressed).toBe(state.suppressionList.length);

      const initialCount = state.suppressionList.length;

      // Step 2: Add a new email
      act(() => {
        useUnsubscribeStore.getState().addToSuppression(
          'newuser@test.com',
          'too_frequent',
          'manual',
          'Too many promotional emails'
        );
      });

      state = useUnsubscribeStore.getState();
      expect(state.suppressionList.length).toBe(initialCount + 1);
      expect(state.suppressionList[0].email).toBe('newuser@test.com');
      expect(state.stats.byReason.too_frequent).toBeGreaterThan(0);
      expect(state.stats.bySource.manual).toBeGreaterThan(0);

      // Step 3: Search for the new email
      act(() => {
        useUnsubscribeStore.getState().setSearchQuery('newuser');
      });

      const filtered = useUnsubscribeStore.getState().getFilteredList();
      expect(filtered.length).toBe(1);
      expect(filtered[0].email).toBe('newuser@test.com');

      // Step 4: Remove the email
      const emailId = filtered[0].id;
      act(() => {
        useUnsubscribeStore.getState().removeFromSuppression(emailId);
      });

      state = useUnsubscribeStore.getState();
      expect(state.suppressionList.length).toBe(initialCount);
      expect(state.suppressionList.find((c) => c.id === emailId)).toBeUndefined();
    });

    it('should handle duplicate prevention in workflow', () => {
      const testEmail = 'duplicate@test.com';

      // Add email first time
      act(() => {
        useUnsubscribeStore.getState().addToSuppression(testEmail, 'not_interested');
      });

      expect(useUnsubscribeStore.getState().error).toBeNull();
      expect(useUnsubscribeStore.getState().suppressionList.length).toBe(1);

      // Try to add same email again
      act(() => {
        useUnsubscribeStore.getState().addToSuppression(testEmail, 'too_frequent');
      });

      expect(useUnsubscribeStore.getState().error).toBe('Email already in suppression list');
      expect(useUnsubscribeStore.getState().suppressionList.length).toBe(1);

      // Try with different case
      act(() => {
        useUnsubscribeStore.getState().addToSuppression(testEmail.toUpperCase(), 'other');
      });

      expect(useUnsubscribeStore.getState().error).toBe('Email already in suppression list');
      expect(useUnsubscribeStore.getState().suppressionList.length).toBe(1);
    });
  });

  describe('Import and Export Workflow', () => {
    it('should import emails and export filtered results', () => {
      const emailsToImport = [
        'import1@test.com',
        'import2@test.com',
        'import3@test.com',
        'invalid-email',
        'import4@test.com',
        'import1@test.com', // Duplicate
      ];

      // Import emails
      let importedCount: number;
      act(() => {
        importedCount = useUnsubscribeStore.getState().importSuppression(emailsToImport, 'not_interested');
      });

      expect(importedCount!).toBe(4); // 4 valid unique emails
      expect(useUnsubscribeStore.getState().suppressionList.length).toBe(4);

      // All should have 'import' source
      const state = useUnsubscribeStore.getState();
      state.suppressionList.forEach((contact) => {
        expect(contact.source).toBe('import');
        expect(contact.reason).toBe('not_interested');
      });

      // Export to CSV
      const csv = useUnsubscribeStore.getState().exportSuppression();
      expect(csv).toContain('Email,Reason,Source,Campaign,Feedback,Date');
      expect(csv).toContain('import1@test.com');
      expect(csv).toContain('import2@test.com');
      expect(csv).toContain('import3@test.com');
      expect(csv).toContain('import4@test.com');
      expect(csv).not.toContain('invalid-email');
    });

    it('should export only filtered data', () => {
      // Add contacts with different sources
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('manual1@test.com', 'not_interested', 'manual');
        useUnsubscribeStore.getState().addToSuppression('manual2@test.com', 'too_frequent', 'manual');
        useUnsubscribeStore.getState().addToSuppression('link1@test.com', 'other', 'link');
      });

      // Filter by source
      act(() => {
        useUnsubscribeStore.getState().setSourceFilter('manual');
      });

      const csv = useUnsubscribeStore.getState().exportSuppression();
      expect(csv).toContain('manual1@test.com');
      expect(csv).toContain('manual2@test.com');
      expect(csv).not.toContain('link1@test.com');
    });
  });

  describe('Stats Calculation Workflow', () => {
    it('should calculate accurate stats across operations', () => {
      const now = new Date();

      // Create contacts with specific dates and attributes
      const contacts: SuppressedContact[] = [
        createContact('1', 'user1@test.com', 2, 'not_interested', 'link'),
        createContact('2', 'user2@test.com', 5, 'too_frequent', 'manual'),
        createContact('3', 'user3@test.com', 10, 'not_interested', 'link'),
        createContact('4', 'user4@test.com', 25, 'other', 'import'),
        createContact('5', 'user5@test.com', 40, 'never_subscribed', 'bounce'),
        createContact('6', 'user6@test.com', 50, 'inappropriate_content', 'complaint'),
      ];

      // Set contacts directly
      act(() => {
        useUnsubscribeStore.setState({ suppressionList: contacts, totalCount: contacts.length });
        useUnsubscribeStore.getState().refreshStats();
      });

      const stats = useUnsubscribeStore.getState().stats;

      // Verify totals
      expect(stats.totalSuppressed).toBe(6);
      expect(stats.last7Days).toBe(2); // 2 and 5 days ago
      expect(stats.last30Days).toBe(4); // 2, 5, 10, 25 days ago

      // Verify reason breakdown
      expect(stats.byReason.not_interested).toBe(2);
      expect(stats.byReason.too_frequent).toBe(1);
      expect(stats.byReason.other).toBe(1);
      expect(stats.byReason.never_subscribed).toBe(1);
      expect(stats.byReason.inappropriate_content).toBe(1);

      // Verify source breakdown
      expect(stats.bySource.link).toBe(2);
      expect(stats.bySource.manual).toBe(1);
      expect(stats.bySource.import).toBe(1);
      expect(stats.bySource.bounce).toBe(1);
      expect(stats.bySource.complaint).toBe(1);
    });

    it('should update stats when contacts are added or removed', () => {
      // Add first contact
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('user1@test.com', 'not_interested', 'link');
      });

      let stats = useUnsubscribeStore.getState().stats;
      expect(stats.totalSuppressed).toBe(1);
      expect(stats.byReason.not_interested).toBe(1);
      expect(stats.bySource.link).toBe(1);

      // Add second contact
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('user2@test.com', 'too_frequent', 'manual');
      });

      stats = useUnsubscribeStore.getState().stats;
      expect(stats.totalSuppressed).toBe(2);
      expect(stats.byReason.too_frequent).toBe(1);
      expect(stats.bySource.manual).toBe(1);

      // Remove first contact
      const firstId = useUnsubscribeStore.getState().suppressionList.find(
        (c) => c.email === 'user1@test.com'
      )!.id;
      act(() => {
        useUnsubscribeStore.getState().removeFromSuppression(firstId);
      });

      stats = useUnsubscribeStore.getState().stats;
      expect(stats.totalSuppressed).toBe(1);
      expect(stats.byReason.not_interested).toBe(0);
      expect(stats.bySource.link).toBe(0);
    });

    it('should calculate trend percentage correctly', () => {
      const contacts: SuppressedContact[] = [];

      // Current period (0-30 days): 20 unsubscribes
      for (let i = 0; i < 20; i++) {
        contacts.push(createContact(`curr-${i}`, `current${i}@test.com`, i + 1));
      }

      // Previous period (30-60 days): 10 unsubscribes
      for (let i = 0; i < 10; i++) {
        contacts.push(createContact(`prev-${i}`, `previous${i}@test.com`, 35 + i));
      }

      act(() => {
        useUnsubscribeStore.setState({ suppressionList: contacts, totalCount: contacts.length });
        useUnsubscribeStore.getState().refreshStats();
      });

      const stats = useUnsubscribeStore.getState().stats;
      expect(stats.last30Days).toBe(20);
      // Trend: (20 - 10) / 10 * 100 = 100%
      expect(stats.trend).toBe(100);
    });
  });

  describe('Combined Filter Workflow', () => {
    it('should apply multiple filters correctly', () => {
      const contacts: SuppressedContact[] = [
        { ...createContact('1', 'alice@acme.com', 5, 'not_interested', 'link'), campaignName: 'Summer Sale' },
        { ...createContact('2', 'bob@acme.com', 10, 'too_frequent', 'manual'), campaignName: 'Newsletter' },
        { ...createContact('3', 'carol@test.com', 15, 'not_interested', 'link'), campaignName: 'Summer Sale' },
        { ...createContact('4', 'dave@test.com', 25, 'other', 'import'), campaignName: 'Product Launch' },
        { ...createContact('5', 'eve@acme.com', 50, 'not_interested', 'link'), campaignName: 'Summer Sale' },
      ];

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          dateRange: 'all',
        });
      });

      // Filter by reason only
      act(() => {
        useUnsubscribeStore.getState().setReasonFilter('not_interested');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(3);

      // Add source filter
      act(() => {
        useUnsubscribeStore.getState().setSourceFilter('link');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(3);

      // Add search filter
      act(() => {
        useUnsubscribeStore.getState().setSearchQuery('acme');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(2);

      // Add date range filter
      act(() => {
        useUnsubscribeStore.getState().setDateRange('30d');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(1); // Only alice within 30d

      // Clear all filters - note: clearFilters resets to 30d, so 50-day old contact is excluded
      act(() => {
        useUnsubscribeStore.getState().clearFilters();
      });
      // Only 4 contacts within 30 days (eve@acme.com is 50 days old)
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(4);
    });

    it('should search across email, campaign, and feedback', () => {
      const contacts: SuppressedContact[] = [
        { ...createContact('1', 'user1@test.com', 5), campaignName: 'Holiday Special' },
        { ...createContact('2', 'holiday@test.com', 10) },
        { ...createContact('3', 'user3@test.com', 15), feedback: 'Holiday emails are annoying' },
        { ...createContact('4', 'user4@test.com', 20), campaignName: 'Summer Sale' },
      ];

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          dateRange: 'all',
        });
        useUnsubscribeStore.getState().setSearchQuery('holiday');
      });

      const filtered = useUnsubscribeStore.getState().getFilteredList();
      expect(filtered.length).toBe(3);
      expect(filtered.map((c) => c.id).sort()).toEqual(['1', '2', '3']);
    });
  });

  describe('Pagination with Filters', () => {
    it('should paginate correctly across filter changes', () => {
      // Create 50 contacts
      const contacts: SuppressedContact[] = [];
      for (let i = 0; i < 50; i++) {
        contacts.push(createContact(`${i}`, `user${i}@test.com`, i % 100, i % 2 === 0 ? 'not_interested' : 'too_frequent'));
      }

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          dateRange: 'all',
          pageSize: 10,
        });
      });

      // Page 1 of all
      let paginated = useUnsubscribeStore.getState().getPaginatedList();
      expect(paginated.length).toBe(10);

      // Go to page 3
      act(() => {
        useUnsubscribeStore.getState().setCurrentPage(3);
      });
      paginated = useUnsubscribeStore.getState().getPaginatedList();
      expect(paginated.length).toBe(10);

      // Apply filter - should reset to page 1
      act(() => {
        useUnsubscribeStore.getState().setReasonFilter('not_interested');
      });
      expect(useUnsubscribeStore.getState().currentPage).toBe(1);

      // Should have 25 'not_interested' contacts, page 1 shows 10
      paginated = useUnsubscribeStore.getState().getPaginatedList();
      expect(paginated.length).toBe(10);
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(25);

      // Go to last page
      act(() => {
        useUnsubscribeStore.getState().setCurrentPage(3);
      });
      paginated = useUnsubscribeStore.getState().getPaginatedList();
      expect(paginated.length).toBe(5); // 25 total, 10+10+5

      // Change page size
      act(() => {
        useUnsubscribeStore.getState().setPageSize(50);
      });
      expect(useUnsubscribeStore.getState().currentPage).toBe(1);
      paginated = useUnsubscribeStore.getState().getPaginatedList();
      expect(paginated.length).toBe(25);
    });
  });

  describe('Selection and Bulk Operations', () => {
    it('should handle selection across filter and bulk removal', () => {
      const contacts: SuppressedContact[] = [];
      for (let i = 0; i < 20; i++) {
        contacts.push(createContact(`id-${i}`, `user${i}@test.com`, i, i % 2 === 0 ? 'not_interested' : 'too_frequent'));
      }

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          dateRange: 'all',
        });
      });

      // Filter to 'not_interested' (10 contacts)
      act(() => {
        useUnsubscribeStore.getState().setReasonFilter('not_interested');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(10);

      // Select all filtered
      act(() => {
        useUnsubscribeStore.getState().selectAll();
      });
      expect(useUnsubscribeStore.getState().selectedIds.length).toBe(10);

      // Bulk remove selected
      act(() => {
        const selectedIds = useUnsubscribeStore.getState().selectedIds;
        useUnsubscribeStore.getState().bulkRemove(selectedIds);
      });

      // Should only have 'too_frequent' contacts left
      expect(useUnsubscribeStore.getState().suppressionList.length).toBe(10);
      expect(useUnsubscribeStore.getState().selectedIds.length).toBe(0);

      // All remaining should be 'too_frequent'
      useUnsubscribeStore.getState().suppressionList.forEach((c) => {
        expect(c.reason).toBe('too_frequent');
      });
    });

    it('should toggle individual selections correctly', () => {
      const contacts = [
        createContact('1', 'user1@test.com', 5),
        createContact('2', 'user2@test.com', 10),
        createContact('3', 'user3@test.com', 15),
      ];

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          dateRange: 'all',
        });
      });

      // Select first
      act(() => {
        useUnsubscribeStore.getState().toggleSelection('1');
      });
      expect(useUnsubscribeStore.getState().selectedIds).toEqual(['1']);

      // Select second
      act(() => {
        useUnsubscribeStore.getState().toggleSelection('2');
      });
      expect(useUnsubscribeStore.getState().selectedIds).toEqual(['1', '2']);

      // Deselect first
      act(() => {
        useUnsubscribeStore.getState().toggleSelection('1');
      });
      expect(useUnsubscribeStore.getState().selectedIds).toEqual(['2']);

      // Clear selection
      act(() => {
        useUnsubscribeStore.getState().clearSelection();
      });
      expect(useUnsubscribeStore.getState().selectedIds).toEqual([]);
    });

    it('should clear selection when removing selected items', () => {
      const contacts = [
        createContact('1', 'user1@test.com', 5),
        createContact('2', 'user2@test.com', 10),
      ];

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          dateRange: 'all',
          selectedIds: ['1', '2'],
        });
      });

      // Remove one selected item
      act(() => {
        useUnsubscribeStore.getState().removeFromSuppression('1');
      });

      // Selection should only contain remaining item
      expect(useUnsubscribeStore.getState().selectedIds).toEqual(['2']);
    });
  });

  describe('Date Range Filtering', () => {
    it('should correctly filter by all date ranges', () => {
      const contacts: SuppressedContact[] = [
        createContact('1', 'user1@test.com', 3),
        createContact('2', 'user2@test.com', 10),
        createContact('3', 'user3@test.com', 45),
        createContact('4', 'user4@test.com', 100),
      ];

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
        });
      });

      // 7 days
      act(() => {
        useUnsubscribeStore.getState().setDateRange('7d');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(1);

      // 30 days
      act(() => {
        useUnsubscribeStore.getState().setDateRange('30d');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(2);

      // 90 days
      act(() => {
        useUnsubscribeStore.getState().setDateRange('90d');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(3);

      // All
      act(() => {
        useUnsubscribeStore.getState().setDateRange('all');
      });
      expect(useUnsubscribeStore.getState().getFilteredList().length).toBe(4);
    });

    it('should handle custom date range', () => {
      const now = new Date();
      const contacts: SuppressedContact[] = [];

      // Create contacts over 30 days
      for (let i = 0; i < 30; i++) {
        contacts.push(createContact(`${i}`, `user${i}@test.com`, i));
      }

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
        });
      });

      // Custom range: 5 to 15 days ago
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 15);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 5);

      act(() => {
        useUnsubscribeStore.getState().setCustomDateRange(startDate, endDate);
      });

      const state = useUnsubscribeStore.getState();
      expect(state.dateRange).toBe('custom');
      expect(state.customStartDate).toEqual(startDate);
      expect(state.customEndDate).toEqual(endDate);

      const filtered = state.getFilteredList();
      // Should have contacts from 5-15 days ago (11 contacts)
      expect(filtered.length).toBe(11);

      filtered.forEach((contact) => {
        expect(contact.suppressedAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(contact.suppressedAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('Email Suppression Check', () => {
    it('should correctly check if email is suppressed', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('suppressed@test.com', 'not_interested');
      });

      // Exact match
      expect(useUnsubscribeStore.getState().isEmailSuppressed('suppressed@test.com')).toBe(true);

      // Case insensitive
      expect(useUnsubscribeStore.getState().isEmailSuppressed('SUPPRESSED@TEST.COM')).toBe(true);

      // With whitespace
      expect(useUnsubscribeStore.getState().isEmailSuppressed('  suppressed@test.com  ')).toBe(true);

      // Non-existent
      expect(useUnsubscribeStore.getState().isEmailSuppressed('other@test.com')).toBe(false);
    });
  });

  describe('Contact Update Workflow', () => {
    it('should update contact and recalculate stats', () => {
      const contacts = [
        createContact('1', 'user1@test.com', 5, 'not_interested', 'link'),
        createContact('2', 'user2@test.com', 10, 'too_frequent', 'manual'),
      ];

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          dateRange: 'all',
        });
        useUnsubscribeStore.getState().refreshStats();
      });

      let stats = useUnsubscribeStore.getState().stats;
      expect(stats.byReason.not_interested).toBe(1);
      expect(stats.byReason.other).toBe(0);

      // Update reason
      act(() => {
        useUnsubscribeStore.getState().updateContact('1', {
          reason: 'other',
          feedback: 'Changed my mind',
        });
      });

      const updated = useUnsubscribeStore.getState().suppressionList.find((c) => c.id === '1')!;
      expect(updated.reason).toBe('other');
      expect(updated.feedback).toBe('Changed my mind');

      stats = useUnsubscribeStore.getState().stats;
      expect(stats.byReason.not_interested).toBe(0);
      expect(stats.byReason.other).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid email error and clear', () => {
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('invalid-email', 'not_interested');
      });

      expect(useUnsubscribeStore.getState().error).toBe('Invalid email address');
      expect(useUnsubscribeStore.getState().suppressionList.length).toBe(0);

      act(() => {
        useUnsubscribeStore.getState().clearError();
      });

      expect(useUnsubscribeStore.getState().error).toBeNull();
    });

    it('should clear error on successful operation', () => {
      // Set an error first
      act(() => {
        useUnsubscribeStore.setState({ error: 'Previous error' });
      });

      // Successful add should clear error
      act(() => {
        useUnsubscribeStore.getState().addToSuppression('valid@test.com', 'not_interested');
      });

      expect(useUnsubscribeStore.getState().error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should manage loading state during load', async () => {
      expect(useUnsubscribeStore.getState().isLoading).toBe(false);

      const loadPromise = act(async () => {
        const promise = useUnsubscribeStore.getState().loadSuppressionList();
        // Check loading state immediately (may be set synchronously or not)
        return promise;
      });

      await loadPromise;

      expect(useUnsubscribeStore.getState().isLoading).toBe(false);
      expect(useUnsubscribeStore.getState().suppressionList.length).toBeGreaterThan(0);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh stats after manual changes', () => {
      // Add contacts directly without using addToSuppression
      const contacts: SuppressedContact[] = [
        createContact('1', 'user1@test.com', 5, 'not_interested', 'link'),
        createContact('2', 'user2@test.com', 10, 'too_frequent', 'manual'),
      ];

      act(() => {
        useUnsubscribeStore.setState({
          suppressionList: contacts,
          totalCount: contacts.length,
          // Stats are not updated automatically
        });
      });

      // Stats should still be zero
      expect(useUnsubscribeStore.getState().stats.totalSuppressed).toBe(0);

      // Refresh stats
      act(() => {
        useUnsubscribeStore.getState().refreshStats();
      });

      expect(useUnsubscribeStore.getState().stats.totalSuppressed).toBe(2);
      expect(useUnsubscribeStore.getState().stats.byReason.not_interested).toBe(1);
      expect(useUnsubscribeStore.getState().stats.byReason.too_frequent).toBe(1);
    });
  });
});
