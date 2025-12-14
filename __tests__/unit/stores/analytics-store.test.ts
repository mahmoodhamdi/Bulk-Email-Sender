import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  useAnalyticsStore,
  formatNumber,
  formatPercentage,
  getChangeIndicator,
  getChangeColor,
  type CampaignMetrics,
  type AnalyticsSummary,
} from '@/stores/analytics-store';

describe('Analytics Store', () => {
  beforeEach(() => {
    // Reset store to initial state
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

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAnalyticsStore.getState();
      expect(state.campaigns).toEqual([]);
      expect(state.timeSeries).toEqual([]);
      expect(state.emailClients).toEqual([]);
      expect(state.devices).toEqual([]);
      expect(state.topLinks).toEqual([]);
      expect(state.dateRange).toBe('30d');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.summary.totalSent).toBe(0);
    });
  });

  describe('Data Actions', () => {
    it('should set campaigns', () => {
      const mockCampaigns: CampaignMetrics[] = [
        {
          id: '1',
          name: 'Test Campaign',
          status: 'completed',
          sent: 1000,
          delivered: 950,
          opened: 300,
          clicked: 100,
          bounced: 50,
          unsubscribed: 10,
          complaints: 2,
          sentAt: new Date(),
        },
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(mockCampaigns);
      });

      expect(useAnalyticsStore.getState().campaigns).toEqual(mockCampaigns);
    });

    it('should set time series data', () => {
      const mockTimeSeries = [
        { date: '2025-01-01', opens: 100, clicks: 50, bounces: 5, unsubscribes: 2 },
        { date: '2025-01-02', opens: 150, clicks: 75, bounces: 3, unsubscribes: 1 },
      ];

      act(() => {
        useAnalyticsStore.getState().setTimeSeries(mockTimeSeries);
      });

      expect(useAnalyticsStore.getState().timeSeries).toEqual(mockTimeSeries);
    });

    it('should set email clients data', () => {
      const mockClients = [
        { client: 'Gmail', count: 500, percentage: 50 },
        { client: 'Outlook', count: 300, percentage: 30 },
      ];

      act(() => {
        useAnalyticsStore.getState().setEmailClients(mockClients);
      });

      expect(useAnalyticsStore.getState().emailClients).toEqual(mockClients);
    });

    it('should set devices data', () => {
      const mockDevices = [
        { device: 'Mobile', count: 600, percentage: 60 },
        { device: 'Desktop', count: 400, percentage: 40 },
      ];

      act(() => {
        useAnalyticsStore.getState().setDevices(mockDevices);
      });

      expect(useAnalyticsStore.getState().devices).toEqual(mockDevices);
    });

    it('should set top links', () => {
      const mockLinks = [
        { url: 'https://example.com/1', clicks: 200, uniqueClicks: 180 },
        { url: 'https://example.com/2', clicks: 150, uniqueClicks: 130 },
      ];

      act(() => {
        useAnalyticsStore.getState().setTopLinks(mockLinks);
      });

      expect(useAnalyticsStore.getState().topLinks).toEqual(mockLinks);
    });
  });

  describe('Summary Calculation', () => {
    it('should calculate summary from campaigns', () => {
      const campaigns: CampaignMetrics[] = [
        {
          id: '1',
          name: 'Campaign 1',
          status: 'completed',
          sent: 1000,
          delivered: 950,
          opened: 300,
          clicked: 100,
          bounced: 50,
          unsubscribed: 10,
          complaints: 2,
          sentAt: new Date(),
        },
        {
          id: '2',
          name: 'Campaign 2',
          status: 'completed',
          sent: 2000,
          delivered: 1900,
          opened: 600,
          clicked: 200,
          bounced: 100,
          unsubscribed: 20,
          complaints: 3,
          sentAt: new Date(),
        },
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(campaigns);
        useAnalyticsStore.getState().calculateSummary();
      });

      const summary = useAnalyticsStore.getState().summary;
      expect(summary.totalSent).toBe(3000);
      expect(summary.totalDelivered).toBe(2850);
      expect(summary.totalOpened).toBe(900);
      expect(summary.totalClicked).toBe(300);
      expect(summary.totalBounced).toBe(150);
      expect(summary.totalUnsubscribed).toBe(30);
      expect(summary.deliveryRate).toBeCloseTo(95, 0);
      expect(summary.openRate).toBeCloseTo(31.58, 0);
      expect(summary.clickRate).toBeCloseTo(10.53, 0);
    });

    it('should handle empty campaigns', () => {
      act(() => {
        useAnalyticsStore.getState().setCampaigns([]);
        useAnalyticsStore.getState().calculateSummary();
      });

      const summary = useAnalyticsStore.getState().summary;
      expect(summary.totalSent).toBe(0);
      expect(summary.deliveryRate).toBe(0);
      expect(summary.openRate).toBe(0);
    });
  });

  describe('Filter Actions', () => {
    it('should set date range', () => {
      act(() => {
        useAnalyticsStore.getState().setDateRange('7d');
      });

      expect(useAnalyticsStore.getState().dateRange).toBe('7d');
    });

    it('should set custom date range', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');

      act(() => {
        useAnalyticsStore.getState().setCustomDateRange(start, end);
      });

      const state = useAnalyticsStore.getState();
      expect(state.dateRange).toBe('custom');
      expect(state.customStartDate).toEqual(start);
      expect(state.customEndDate).toEqual(end);
    });

    it('should set selected campaign', () => {
      act(() => {
        useAnalyticsStore.getState().setSelectedCampaign('campaign-123');
      });

      expect(useAnalyticsStore.getState().selectedCampaignId).toBe('campaign-123');
    });

    it('should clear selected campaign', () => {
      act(() => {
        useAnalyticsStore.getState().setSelectedCampaign('campaign-123');
        useAnalyticsStore.getState().setSelectedCampaign(null);
      });

      expect(useAnalyticsStore.getState().selectedCampaignId).toBeNull();
    });
  });

  describe('Filtered Campaigns', () => {
    const createCampaign = (id: string, name: string, daysAgo: number): CampaignMetrics => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return {
        id,
        name,
        status: 'completed',
        sent: 1000,
        delivered: 950,
        opened: 300,
        clicked: 100,
        bounced: 50,
        unsubscribed: 10,
        complaints: 2,
        sentAt: date,
      };
    };

    it('should filter campaigns by date range', () => {
      const campaigns = [
        createCampaign('1', 'Recent', 5),
        createCampaign('2', 'Old', 45),
        createCampaign('3', 'Very Old', 100),
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(campaigns);
        useAnalyticsStore.getState().setDateRange('30d');
      });

      const filtered = useAnalyticsStore.getState().getFilteredCampaigns();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Recent');
    });

    it('should filter campaigns by selected campaign', () => {
      const campaigns = [
        createCampaign('1', 'Campaign 1', 5),
        createCampaign('2', 'Campaign 2', 10),
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(campaigns);
        useAnalyticsStore.getState().setSelectedCampaign('2');
        useAnalyticsStore.getState().setDateRange('all');
      });

      const filtered = useAnalyticsStore.getState().getFilteredCampaigns();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should return all campaigns for "all" date range', () => {
      const campaigns = [
        createCampaign('1', 'Recent', 5),
        createCampaign('2', 'Old', 200),
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(campaigns);
        useAnalyticsStore.getState().setDateRange('all');
      });

      const filtered = useAnalyticsStore.getState().getFilteredCampaigns();
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Export to CSV', () => {
    it('should export campaigns to CSV', () => {
      const campaigns: CampaignMetrics[] = [
        {
          id: '1',
          name: 'Test Campaign',
          status: 'completed',
          sent: 1000,
          delivered: 950,
          opened: 300,
          clicked: 100,
          bounced: 50,
          unsubscribed: 10,
          complaints: 2,
          sentAt: new Date(), // Use current date to be within any date range
        },
      ];

      act(() => {
        useAnalyticsStore.getState().setCampaigns(campaigns);
        useAnalyticsStore.getState().setDateRange('all'); // Ensure all campaigns are included
        useAnalyticsStore.getState().calculateSummary();
      });

      const csv = useAnalyticsStore.getState().exportToCSV();
      expect(csv).toContain('Campaign Name');
      expect(csv).toContain('Test Campaign');
      expect(csv).toContain('1000');
      expect(csv).toContain('Summary');
    });
  });

  describe('Loading State', () => {
    it('should load analytics', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().loadAnalytics();
      });

      const state = useAnalyticsStore.getState();
      expect(state.campaigns.length).toBeGreaterThan(0);
      expect(state.timeSeries.length).toBeGreaterThan(0);
      expect(state.emailClients.length).toBeGreaterThan(0);
      expect(state.devices.length).toBeGreaterThan(0);
      expect(state.topLinks.length).toBeGreaterThan(0);
      expect(state.isLoading).toBe(false);
    });

    it('should refresh analytics', async () => {
      await act(async () => {
        await useAnalyticsStore.getState().refreshAnalytics();
      });

      expect(useAnalyticsStore.getState().campaigns.length).toBeGreaterThan(0);
    });
  });

  describe('Utility Functions', () => {
    it('should set loading state', () => {
      act(() => {
        useAnalyticsStore.getState().setLoading(true);
      });
      expect(useAnalyticsStore.getState().isLoading).toBe(true);

      act(() => {
        useAnalyticsStore.getState().setLoading(false);
      });
      expect(useAnalyticsStore.getState().isLoading).toBe(false);
    });

    it('should clear error', () => {
      act(() => {
        useAnalyticsStore.setState({ error: 'Test error' });
      });
      expect(useAnalyticsStore.getState().error).toBe('Test error');

      act(() => {
        useAnalyticsStore.getState().clearError();
      });
      expect(useAnalyticsStore.getState().error).toBeNull();
    });
  });
});

describe('Analytics Utility Functions', () => {
  describe('formatNumber', () => {
    it('should format numbers in thousands', () => {
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(15000)).toBe('15.0K');
    });

    it('should format numbers in millions', () => {
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(15000000)).toBe('15.0M');
    });

    it('should not format small numbers', () => {
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(999)).toBe('999');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with decimals', () => {
      expect(formatPercentage(25.5)).toBe('25.5%');
      expect(formatPercentage(100)).toBe('100.0%');
    });

    it('should respect decimal places', () => {
      expect(formatPercentage(25.567, 2)).toBe('25.57%');
      expect(formatPercentage(25, 0)).toBe('25%');
    });
  });

  describe('getChangeIndicator', () => {
    it('should return up for positive change', () => {
      expect(getChangeIndicator(5)).toBe('up');
      expect(getChangeIndicator(0.6)).toBe('up');
    });

    it('should return down for negative change', () => {
      expect(getChangeIndicator(-5)).toBe('down');
      expect(getChangeIndicator(-0.6)).toBe('down');
    });

    it('should return neutral for small changes', () => {
      expect(getChangeIndicator(0)).toBe('neutral');
      expect(getChangeIndicator(0.3)).toBe('neutral');
      expect(getChangeIndicator(-0.3)).toBe('neutral');
    });
  });

  describe('getChangeColor', () => {
    it('should return green for positive change', () => {
      expect(getChangeColor(5)).toBe('text-green-500');
    });

    it('should return red for negative change', () => {
      expect(getChangeColor(-5)).toBe('text-red-500');
    });

    it('should return gray for no change', () => {
      expect(getChangeColor(0)).toBe('text-gray-500');
    });

    it('should invert colors when requested', () => {
      expect(getChangeColor(5, true)).toBe('text-red-500');
      expect(getChangeColor(-5, true)).toBe('text-green-500');
    });
  });
});

describe('Comparison Calculation', () => {
  beforeEach(() => {
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

  it('should calculate comparison between periods', () => {
    const createCampaign = (id: string, daysAgo: number, sent: number): CampaignMetrics => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return {
        id,
        name: `Campaign ${id}`,
        status: 'completed',
        sent,
        delivered: sent * 0.95,
        opened: sent * 0.25,
        clicked: sent * 0.1,
        bounced: sent * 0.05,
        unsubscribed: sent * 0.01,
        complaints: 1,
        sentAt: date,
      };
    };

    const campaigns = [
      createCampaign('1', 5, 1000),  // Current period
      createCampaign('2', 10, 800),  // Current period
      createCampaign('3', 40, 600),  // Previous period
      createCampaign('4', 50, 500),  // Previous period
    ];

    act(() => {
      useAnalyticsStore.getState().setCampaigns(campaigns);
      useAnalyticsStore.getState().setDateRange('30d');
      useAnalyticsStore.getState().calculateComparison();
    });

    const comparison = useAnalyticsStore.getState().comparison;
    expect(comparison).not.toBeNull();
    expect(comparison!.current.totalSent).toBe(1800); // 1000 + 800
    expect(comparison!.previous.totalSent).toBe(1100); // 600 + 500
  });

  it('should handle "all" date range by setting comparison to null', () => {
    act(() => {
      useAnalyticsStore.getState().setDateRange('all');
      useAnalyticsStore.getState().calculateComparison();
    });

    expect(useAnalyticsStore.getState().comparison).toBeNull();
  });
});
