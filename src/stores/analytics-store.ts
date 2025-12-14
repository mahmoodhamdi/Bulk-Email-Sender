import { create } from 'zustand';

export interface CampaignMetrics {
  id: string;
  name: string;
  status: 'completed' | 'sending' | 'scheduled';
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complaints: number;
  sentAt: Date;
}

export interface TimeSeriesDataPoint {
  date: string;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
}

export interface EmailClientData {
  client: string;
  count: number;
  percentage: number;
}

export interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

export interface TopLink {
  url: string;
  clicks: number;
  uniqueClicks: number;
}

export interface AnalyticsSummary {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  clickToOpenRate: number;
}

export interface PeriodComparison {
  current: AnalyticsSummary;
  previous: AnalyticsSummary;
  changes: {
    sentChange: number;
    deliveryRateChange: number;
    openRateChange: number;
    clickRateChange: number;
    bounceRateChange: number;
  };
}

export type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom';

interface AnalyticsState {
  // Data
  campaigns: CampaignMetrics[];
  timeSeries: TimeSeriesDataPoint[];
  emailClients: EmailClientData[];
  devices: DeviceData[];
  topLinks: TopLink[];
  summary: AnalyticsSummary;
  comparison: PeriodComparison | null;

  // Filters
  dateRange: DateRange;
  customStartDate: Date | null;
  customEndDate: Date | null;
  selectedCampaignId: string | null;

  // UI State
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsActions {
  // Data actions
  setCampaigns: (campaigns: CampaignMetrics[]) => void;
  setTimeSeries: (data: TimeSeriesDataPoint[]) => void;
  setEmailClients: (data: EmailClientData[]) => void;
  setDevices: (data: DeviceData[]) => void;
  setTopLinks: (links: TopLink[]) => void;
  calculateSummary: () => void;
  calculateComparison: () => void;

  // Filter actions
  setDateRange: (range: DateRange) => void;
  setCustomDateRange: (start: Date, end: Date) => void;
  setSelectedCampaign: (campaignId: string | null) => void;

  // Data fetching (mock)
  loadAnalytics: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;

  // Utility
  getFilteredCampaigns: () => CampaignMetrics[];
  exportToCSV: () => string;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AnalyticsStore = AnalyticsState & AnalyticsActions;

// Helper to generate mock data
const generateMockCampaigns = (): CampaignMetrics[] => {
  const campaigns: CampaignMetrics[] = [];
  const names = [
    'Welcome Series',
    'Monthly Newsletter',
    'Product Launch',
    'Holiday Sale',
    'Weekly Digest',
    'Re-engagement',
    'Feature Announcement',
    'Customer Survey',
  ];

  for (let i = 0; i < 8; i++) {
    const sent = Math.floor(Math.random() * 10000) + 1000;
    const delivered = Math.floor(sent * (0.95 + Math.random() * 0.04));
    const opened = Math.floor(delivered * (0.15 + Math.random() * 0.25));
    const clicked = Math.floor(opened * (0.1 + Math.random() * 0.3));
    const bounced = sent - delivered;
    const unsubscribed = Math.floor(delivered * Math.random() * 0.02);

    const daysAgo = i * 7 + Math.floor(Math.random() * 7);
    const sentAt = new Date();
    sentAt.setDate(sentAt.getDate() - daysAgo);

    campaigns.push({
      id: `campaign-${i + 1}`,
      name: names[i],
      status: i === 0 ? 'sending' : 'completed',
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      complaints: Math.floor(Math.random() * 5),
      sentAt,
    });
  }

  return campaigns.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
};

const generateMockTimeSeries = (days: number): TimeSeriesDataPoint[] => {
  const data: TimeSeriesDataPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      opens: Math.floor(Math.random() * 500) + 100,
      clicks: Math.floor(Math.random() * 150) + 20,
      bounces: Math.floor(Math.random() * 30) + 5,
      unsubscribes: Math.floor(Math.random() * 10),
    });
  }

  return data;
};

const generateMockEmailClients = (): EmailClientData[] => {
  const clients = [
    { client: 'Gmail', count: 4500 },
    { client: 'Apple Mail', count: 2800 },
    { client: 'Outlook', count: 1900 },
    { client: 'Yahoo Mail', count: 800 },
    { client: 'Other', count: 500 },
  ];

  const total = clients.reduce((sum, c) => sum + c.count, 0);
  return clients.map((c) => ({
    ...c,
    percentage: Math.round((c.count / total) * 100),
  }));
};

const generateMockDevices = (): DeviceData[] => {
  const devices = [
    { device: 'Mobile', count: 5200 },
    { device: 'Desktop', count: 3800 },
    { device: 'Tablet', count: 1000 },
  ];

  const total = devices.reduce((sum, d) => sum + d.count, 0);
  return devices.map((d) => ({
    ...d,
    percentage: Math.round((d.count / total) * 100),
  }));
};

const generateMockTopLinks = (): TopLink[] => {
  return [
    { url: 'https://example.com/products', clicks: 1250, uniqueClicks: 980 },
    { url: 'https://example.com/sale', clicks: 890, uniqueClicks: 720 },
    { url: 'https://example.com/blog', clicks: 650, uniqueClicks: 520 },
    { url: 'https://example.com/contact', clicks: 420, uniqueClicks: 380 },
    { url: 'https://example.com/about', clicks: 280, uniqueClicks: 250 },
  ];
};

const calculateSummaryFromCampaigns = (campaigns: CampaignMetrics[]): AnalyticsSummary => {
  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent,
      delivered: acc.delivered + c.delivered,
      opened: acc.opened + c.opened,
      clicked: acc.clicked + c.clicked,
      bounced: acc.bounced + c.bounced,
      unsubscribed: acc.unsubscribed + c.unsubscribed,
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 }
  );

  return {
    totalSent: totals.sent,
    totalDelivered: totals.delivered,
    totalOpened: totals.opened,
    totalClicked: totals.clicked,
    totalBounced: totals.bounced,
    totalUnsubscribed: totals.unsubscribed,
    deliveryRate: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
    openRate: totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0,
    clickRate: totals.delivered > 0 ? (totals.clicked / totals.delivered) * 100 : 0,
    bounceRate: totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0,
    unsubscribeRate: totals.delivered > 0 ? (totals.unsubscribed / totals.delivered) * 100 : 0,
    clickToOpenRate: totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0,
  };
};

const initialSummary: AnalyticsSummary = {
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
};

const initialState: AnalyticsState = {
  campaigns: [],
  timeSeries: [],
  emailClients: [],
  devices: [],
  topLinks: [],
  summary: initialSummary,
  comparison: null,
  dateRange: '30d',
  customStartDate: null,
  customEndDate: null,
  selectedCampaignId: null,
  isLoading: false,
  error: null,
};

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  ...initialState,

  setCampaigns: (campaigns) => set({ campaigns }),

  setTimeSeries: (data) => set({ timeSeries: data }),

  setEmailClients: (data) => set({ emailClients: data }),

  setDevices: (data) => set({ devices: data }),

  setTopLinks: (links) => set({ topLinks: links }),

  calculateSummary: () => {
    const { getFilteredCampaigns } = get();
    const filtered = getFilteredCampaigns();
    const summary = calculateSummaryFromCampaigns(filtered);
    set({ summary });
  },

  calculateComparison: () => {
    const { campaigns, dateRange, customStartDate, customEndDate } = get();

    let currentStart: Date;
    let currentEnd = new Date();
    let periodDays: number;

    switch (dateRange) {
      case '7d':
        periodDays = 7;
        break;
      case '30d':
        periodDays = 30;
        break;
      case '90d':
        periodDays = 90;
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          periodDays = Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24));
          currentStart = customStartDate;
          currentEnd = customEndDate;
        } else {
          periodDays = 30;
        }
        break;
      default:
        set({ comparison: null });
        return;
    }

    if (dateRange !== 'custom') {
      currentStart = new Date();
      currentStart.setDate(currentStart.getDate() - periodDays);
    }

    const previousStart = new Date(currentStart!);
    previousStart.setDate(previousStart.getDate() - periodDays);
    const previousEnd = new Date(currentStart!);

    const currentCampaigns = campaigns.filter(
      (c) => c.sentAt >= currentStart! && c.sentAt <= currentEnd
    );
    const previousCampaigns = campaigns.filter(
      (c) => c.sentAt >= previousStart && c.sentAt < previousEnd
    );

    const current = calculateSummaryFromCampaigns(currentCampaigns);
    const previous = calculateSummaryFromCampaigns(previousCampaigns);

    const calcChange = (curr: number, prev: number) =>
      prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    set({
      comparison: {
        current,
        previous,
        changes: {
          sentChange: calcChange(current.totalSent, previous.totalSent),
          deliveryRateChange: current.deliveryRate - previous.deliveryRate,
          openRateChange: current.openRate - previous.openRate,
          clickRateChange: current.clickRate - previous.clickRate,
          bounceRateChange: current.bounceRate - previous.bounceRate,
        },
      },
    });
  },

  setDateRange: (range) => {
    set({ dateRange: range });
    const { calculateSummary, calculateComparison } = get();

    // Update time series based on range
    let days = 30;
    switch (range) {
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
      case 'all':
        days = 365;
        break;
    }

    set({ timeSeries: generateMockTimeSeries(days) });
    calculateSummary();
    calculateComparison();
  },

  setCustomDateRange: (start, end) => {
    set({
      dateRange: 'custom',
      customStartDate: start,
      customEndDate: end,
    });
    const { calculateSummary, calculateComparison } = get();
    calculateSummary();
    calculateComparison();
  },

  setSelectedCampaign: (campaignId) => {
    set({ selectedCampaignId: campaignId });
    get().calculateSummary();
  },

  loadAnalytics: async () => {
    set({ isLoading: true, error: null });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const campaigns = generateMockCampaigns();
      const timeSeries = generateMockTimeSeries(30);
      const emailClients = generateMockEmailClients();
      const devices = generateMockDevices();
      const topLinks = generateMockTopLinks();

      set({
        campaigns,
        timeSeries,
        emailClients,
        devices,
        topLinks,
        isLoading: false,
      });

      // Calculate summary after setting data
      get().calculateSummary();
      get().calculateComparison();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load analytics',
        isLoading: false,
      });
    }
  },

  refreshAnalytics: async () => {
    return get().loadAnalytics();
  },

  getFilteredCampaigns: () => {
    const { campaigns, dateRange, customStartDate, customEndDate, selectedCampaignId } = get();

    let filtered = [...campaigns];

    // Filter by selected campaign
    if (selectedCampaignId) {
      filtered = filtered.filter((c) => c.id === selectedCampaignId);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (dateRange === 'custom' && customStartDate) {
        startDate = customStartDate;
        const endDate = customEndDate || now;
        filtered = filtered.filter((c) => c.sentAt >= startDate && c.sentAt <= endDate);
      } else {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        filtered = filtered.filter((c) => c.sentAt >= startDate);
      }
    }

    return filtered;
  },

  exportToCSV: () => {
    const { getFilteredCampaigns, summary } = get();
    const campaigns = getFilteredCampaigns();

    const headers = [
      'Campaign Name',
      'Status',
      'Sent',
      'Delivered',
      'Opened',
      'Clicked',
      'Bounced',
      'Unsubscribed',
      'Sent Date',
    ];

    const rows = campaigns.map((c) => [
      c.name,
      c.status,
      c.sent.toString(),
      c.delivered.toString(),
      c.opened.toString(),
      c.clicked.toString(),
      c.bounced.toString(),
      c.unsubscribed.toString(),
      c.sentAt.toISOString().split('T')[0],
    ]);

    // Add summary row
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Sent', summary.totalSent.toString()]);
    rows.push(['Delivery Rate', `${summary.deliveryRate.toFixed(2)}%`]);
    rows.push(['Open Rate', `${summary.openRate.toFixed(2)}%`]);
    rows.push(['Click Rate', `${summary.clickRate.toFixed(2)}%`]);
    rows.push(['Bounce Rate', `${summary.bounceRate.toFixed(2)}%`]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csvContent;
  },

  clearError: () => set({ error: null }),

  setLoading: (loading) => set({ isLoading: loading }),
}));

// Utility functions
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatPercentage = (num: number, decimals = 1): string => {
  return num.toFixed(decimals) + '%';
};

export const getChangeIndicator = (change: number): 'up' | 'down' | 'neutral' => {
  if (change > 0.5) return 'up';
  if (change < -0.5) return 'down';
  return 'neutral';
};

export const getChangeColor = (change: number, inverseColors = false): string => {
  const isPositive = change > 0;
  if (inverseColors) {
    return isPositive ? 'text-red-500' : change < 0 ? 'text-green-500' : 'text-gray-500';
  }
  return isPositive ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500';
};
