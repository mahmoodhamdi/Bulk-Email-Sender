import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAnalyticsStore, type CampaignMetrics } from '@/stores/analytics-store';

describe('Analytics Store Integration', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
      useAnalyticsStore.setState({
        campaigns: [],
        timeSeries: [],
        emailClients: [],
        devices: [],
        topLinks: [],
        summary: {
          totalSent: 0,
          totalDelivered: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalBounced: 0,
          totalUnsubscribed: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          unsubscribeRate: 0,
          clickToOpenRate: 0,
        },
        comparison: null,
        dateRange: '30d',
        customStartDate: null,
        customEndDate: null,
        selectedCampaignId: null,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('Full Analytics Workflow', () => {
    it('should complete full analytics loading workflow', async () => {
      // Step 1: Load analytics
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const state = useAnalyticsStore.getState();

      // Verify all data loaded
      expect(state.campaigns.length).toBeGreaterThan(0);
      expect(state.timeSeries.length).toBeGreaterThan(0);
      expect(state.emailClients.length).toBeGreaterThan(0);
      expect(state.devices.length).toBeGreaterThan(0);
      expect(state.topLinks.length).toBeGreaterThan(0);

      // Verify summary calculated
      expect(state.summary.totalSent).toBeGreaterThan(0);
      expect(state.summary.deliveryRate).toBeGreaterThan(0);

      // Verify comparison calculated
      expect(state.comparison).not.toBeNull();
    });

    it('should update analytics when date range changes', async () => {
      // Load initial data
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const initial30dSeries = useAnalyticsStore.getState().timeSeries.length;

      // Change to 7 days
      act(() => {
        useAnalyticsStore.getState().setDateRange('7d');
      });

      const updated7dSeries = useAnalyticsStore.getState().timeSeries.length;

      // Change to 90 days
      act(() => {
        useAnalyticsStore.getState().setDateRange('90d');
      });

      const updated90dSeries = useAnalyticsStore.getState().timeSeries.length;

      // Verify different lengths based on date range
      expect(updated7dSeries).toBeLessThan(initial30dSeries);
      expect(updated90dSeries).toBeGreaterThan(initial30dSeries);
    });

    it('should filter and recalculate when campaign selected', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const campaigns = useAnalyticsStore.getState().campaigns;
      const initialSummary = { ...useAnalyticsStore.getState().summary };

      // Select a specific campaign
      act(() => {
        useAnalyticsStore.getState().setSelectedCampaign(campaigns[0].id);
      });

      const filteredSummary = useAnalyticsStore.getState().summary;

      // Summary should be different (less data)
      expect(filteredSummary.totalSent).toBeLessThanOrEqual(initialSummary.totalSent);

      // Clear selection
      act(() => {
        useAnalyticsStore.getState().setSelectedCampaign(null);
      });

      // Recalculate
      act(() => {
        useAnalyticsStore.getState().calculateSummary();
      });

      const clearedSummary = useAnalyticsStore.getState().summary;
      expect(clearedSummary.totalSent).toBe(initialSummary.totalSent);
    });
  });

  describe('Export Workflow', () => {
    it('should export filtered data to CSV', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      // Export all data
      const fullCsv = useAnalyticsStore.getState().exportToCSV();
      expect(fullCsv).toContain('Campaign Name');
      expect(fullCsv).toContain('Summary');

      // Count campaigns in CSV (header + data rows)
      const fullRowCount = fullCsv.split('\n').filter((line) => line.trim()).length;

      // Filter to 7 days
      act(() => {
        useAnalyticsStore.getState().setDateRange('7d');
      });

      const filteredCsv = useAnalyticsStore.getState().exportToCSV();
      const filteredRowCount = filteredCsv.split('\n').filter((line) => line.trim()).length;

      // Filtered should have fewer or equal rows
      expect(filteredRowCount).toBeLessThanOrEqual(fullRowCount);
    });

    it('should include summary in export', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const csv = useAnalyticsStore.getState().exportToCSV();

      expect(csv).toContain('Summary');
      expect(csv).toContain('Total Sent');
      expect(csv).toContain('Delivery Rate');
      expect(csv).toContain('Open Rate');
      expect(csv).toContain('Click Rate');
      expect(csv).toContain('Bounce Rate');
    });
  });

  describe('Date Range Filtering', () => {
    it('should correctly filter by all date ranges', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const ranges = ['7d', '30d', '90d', 'all'] as const;
      const results: Record<string, number> = {};

      for (const range of ranges) {
        act(() => {
          useAnalyticsStore.getState().setDateRange(range);
        });
        results[range] = useAnalyticsStore.getState().getFilteredCampaigns().length;
      }

      // All should include all campaigns
      // 90d should include more than 30d
      // 30d should include more than 7d
      expect(results['all']).toBeGreaterThanOrEqual(results['90d']);
      expect(results['90d']).toBeGreaterThanOrEqual(results['30d']);
      expect(results['30d']).toBeGreaterThanOrEqual(results['7d']);
    });

    it('should handle custom date range', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const start = new Date();
      start.setDate(start.getDate() - 14);
      const end = new Date();

      act(() => {
        useAnalyticsStore.getState().setCustomDateRange(start, end);
      });

      const state = useAnalyticsStore.getState();
      expect(state.dateRange).toBe('custom');
      expect(state.customStartDate).toEqual(start);
      expect(state.customEndDate).toEqual(end);

      const filtered = state.getFilteredCampaigns();
      // All filtered campaigns should be within range
      filtered.forEach((campaign) => {
        expect(campaign.sentAt.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(campaign.sentAt.getTime()).toBeLessThanOrEqual(end.getTime());
      });
    });
  });

  describe('Summary Calculations', () => {
    it('should correctly calculate all summary metrics', () => {
      const campaigns: CampaignMetrics[] = [
        {
          id: '1',
          name: 'Campaign 1',
          status: 'completed',
          sent: 10000,
          delivered: 9500,
          opened: 3000,
          clicked: 1000,
          bounced: 500,
          unsubscribed: 100,
          complaints: 10,
          sentAt: new Date(),
        },
        {
          id: '2',
          name: 'Campaign 2',
          status: 'completed',
          sent: 5000,
          delivered: 4800,
          opened: 1500,
          clicked: 500,
          bounced: 200,
          unsubscribed: 50,
          complaints: 5,
          sentAt: new Date(),
        },
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(campaigns);
        useAnalyticsStore.getState().setDateRange('all');
        useAnalyticsStore.getState().calculateSummary();
      });

      const summary = useAnalyticsStore.getState().summary;

      // Totals
      expect(summary.totalSent).toBe(15000);
      expect(summary.totalDelivered).toBe(14300);
      expect(summary.totalOpened).toBe(4500);
      expect(summary.totalClicked).toBe(1500);
      expect(summary.totalBounced).toBe(700);
      expect(summary.totalUnsubscribed).toBe(150);

      // Rates
      expect(summary.deliveryRate).toBeCloseTo((14300 / 15000) * 100, 1);
      expect(summary.openRate).toBeCloseTo((4500 / 14300) * 100, 1);
      expect(summary.clickRate).toBeCloseTo((1500 / 14300) * 100, 1);
      expect(summary.bounceRate).toBeCloseTo((700 / 15000) * 100, 1);
      expect(summary.unsubscribeRate).toBeCloseTo((150 / 14300) * 100, 1);
      expect(summary.clickToOpenRate).toBeCloseTo((1500 / 4500) * 100, 1);
    });

    it('should handle zero division gracefully', () => {
      act(() => {
        useAnalyticsStore.getState().setCampaigns([]);
        useAnalyticsStore.getState().calculateSummary();
      });

      const summary = useAnalyticsStore.getState().summary;
      expect(summary.deliveryRate).toBe(0);
      expect(summary.openRate).toBe(0);
      expect(summary.clickRate).toBe(0);
      expect(summary.bounceRate).toBe(0);
      expect(summary.clickToOpenRate).toBe(0);
    });
  });

  describe('Comparison Calculations', () => {
    it('should calculate period-over-period changes', () => {
      const createCampaign = (id: string, daysAgo: number, metrics: Partial<CampaignMetrics>): CampaignMetrics => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return {
          id,
          name: `Campaign ${id}`,
          status: 'completed',
          sent: 1000,
          delivered: 950,
          opened: 300,
          clicked: 100,
          bounced: 50,
          unsubscribed: 10,
          complaints: 2,
          sentAt: date,
          ...metrics,
        };
      };

      // Current period: better performance
      // Previous period: worse performance
      const campaigns = [
        createCampaign('1', 5, { sent: 2000, delivered: 1900, opened: 800, clicked: 300 }),
        createCampaign('2', 35, { sent: 1000, delivered: 900, opened: 200, clicked: 50 }),
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(campaigns);
        useAnalyticsStore.getState().setDateRange('30d');
        useAnalyticsStore.getState().calculateComparison();
      });

      const comparison = useAnalyticsStore.getState().comparison;
      expect(comparison).not.toBeNull();

      // Current should have better metrics
      expect(comparison!.current.totalSent).toBe(2000);
      expect(comparison!.previous.totalSent).toBe(1000);

      // Change should be positive
      expect(comparison!.changes.sentChange).toBeGreaterThan(0);
    });
  });

  describe('Real-time Updates', () => {
    it('should update summary when campaigns change', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const initialSent = useAnalyticsStore.getState().summary.totalSent;

      // Add a new campaign
      const newCampaign: CampaignMetrics = {
        id: 'new-campaign',
        name: 'New Campaign',
        status: 'completed',
        sent: 5000,
        delivered: 4800,
        opened: 1500,
        clicked: 500,
        bounced: 200,
        unsubscribed: 50,
        complaints: 5,
        sentAt: new Date(),
      };

      act(() => {
        const currentCampaigns = useAnalyticsStore.getState().campaigns;
        useAnalyticsStore.getState().setCampaigns([...currentCampaigns, newCampaign]);
        useAnalyticsStore.getState().calculateSummary();
      });

      const updatedSent = useAnalyticsStore.getState().summary.totalSent;
      expect(updatedSent).toBe(initialSent + 5000);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh all analytics data', async () => {
      // Initial load
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const initialCampaigns = [...useAnalyticsStore.getState().campaigns];

      // Refresh
      await act(async () => {
        await useAnalyticsStore.getState().refreshAnalytics();
      });

      // Data should be regenerated (mock generates new random data)
      const refreshedCampaigns = useAnalyticsStore.getState().campaigns;
      expect(refreshedCampaigns.length).toBe(initialCampaigns.length);
    });
  });

  describe('Error Handling', () => {
    it('should clear error when requested', () => {
      act(() => {
        useAnalyticsStore.setState({ error: 'Test error message' });
      });

      expect(useAnalyticsStore.getState().error).toBe('Test error message');

      act(() => {
        useAnalyticsStore.getState().clearError();
      });

      expect(useAnalyticsStore.getState().error).toBeNull();
    });
  });
});
