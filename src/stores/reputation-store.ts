import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type AuthStatus = 'valid' | 'invalid' | 'missing' | 'unknown';
export type ReputationLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type WarmingStatus = 'warming' | 'warmed' | 'not_started';
export type VolumeTrend = 'increasing' | 'stable' | 'decreasing';
export type BounceType = 'hard' | 'soft';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ReputationScores {
  bounceRate: number;
  spamComplaint: number;
  engagement: number;
  authentication: number;
  listQuality: number;
}

export interface DeliverabilityMetrics {
  inboxRate: number;
  spamRate: number;
  bounceRate: number;
  hardBounceRate: number;
  softBounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplaints: number;
}

export interface BounceEvent {
  id: string;
  email: string;
  type: BounceType;
  reason: string;
  code?: string;
  campaignId?: string;
  campaignName?: string;
  bouncedAt: Date;
}

export interface BounceStats {
  total: number;
  hard: number;
  soft: number;
  byReason: Record<string, number>;
  recent: BounceEvent[];
}

export interface ComplaintEvent {
  id: string;
  email: string;
  type: string;
  campaignId?: string;
  campaignName?: string;
  reportedAt: Date;
}

export interface ComplaintStats {
  total: number;
  rate: number;
  byType: Record<string, number>;
  recent: ComplaintEvent[];
}

export interface DomainHealth {
  domain: string;
  spf: AuthStatus;
  dkim: AuthStatus;
  dmarc: AuthStatus;
  age: number;
  reputation: ReputationLevel;
  lastChecked: Date;
}

export interface IPHealth {
  ip: string;
  type: 'shared' | 'dedicated';
  reputation: number;
  warmingStatus: WarmingStatus;
  warmingProgress?: number;
  dailyVolume: number;
  volumeTrend: VolumeTrend;
  lastChecked: Date;
}

export interface BlacklistStatus {
  id: string;
  name: string;
  listed: boolean;
  checkedAt: Date;
  delistUrl?: string;
  description?: string;
}

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  category: string;
  title: string;
  description: string;
  impact: string;
  action: string;
  dismissed?: boolean;
  dismissedAt?: Date;
}

export interface TrendDataPoint {
  date: Date;
  score: number;
  inboxRate: number;
  bounceRate: number;
  complaintRate: number;
}

export interface ReputationState {
  // Core data
  overallScore: number;
  scores: ReputationScores;
  metrics: DeliverabilityMetrics;
  bounces: BounceStats;
  complaints: ComplaintStats;
  domainHealth: DomainHealth | null;
  ipHealth: IPHealth | null;
  blacklistStatus: BlacklistStatus[];
  recommendations: Recommendation[];
  trends: TrendDataPoint[];

  // UI state
  isLoading: boolean;
  isCheckingBlacklist: boolean;
  isCheckingDomain: boolean;
  lastUpdated: Date | null;
  error: string | null;

  // Filters
  bounceFilter: {
    type: BounceType | 'all';
    dateRange: 'today' | 'week' | 'month' | 'all';
    search: string;
  };

  // Actions
  loadReputationData: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  checkBlacklists: () => Promise<void>;
  checkDomainHealth: () => Promise<void>;
  removeBounce: (id: string) => void;
  removeBouncesByType: (type: BounceType) => void;
  removeAllBounces: () => void;
  exportBounces: () => BounceEvent[];
  dismissRecommendation: (id: string) => void;
  restoreRecommendation: (id: string) => void;
  setBounceFilter: (filter: Partial<ReputationState['bounceFilter']>) => void;
  getFilteredBounces: () => BounceEvent[];
  calculateOverallScore: () => number;
  getScoreLevel: (score: number) => ReputationLevel;
  reset: () => void;
}

// Helper functions
const getScoreLevel = (score: number): ReputationLevel => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 25) return 'poor';
  return 'critical';
};

const calculateScoreFromRate = (rate: number, thresholds: { excellent: number; good: number; fair: number; poor: number }): number => {
  if (rate <= thresholds.excellent) return 100;
  if (rate <= thresholds.good) return 85;
  if (rate <= thresholds.fair) return 65;
  if (rate <= thresholds.poor) return 40;
  return 20;
};

const generateMockBounces = (): BounceEvent[] => {
  const reasons = ['invalid_email', 'mailbox_full', 'domain_not_found', 'rejected', 'timeout', 'blocked'];
  const domains = ['example.com', 'test.org', 'invalid.net', 'company.io', 'mail.com'];
  const names = ['john', 'jane', 'bob', 'alice', 'charlie', 'david', 'emma', 'frank'];

  return Array.from({ length: 25 }, (_, i) => ({
    id: `bounce-${i + 1}`,
    email: `${names[i % names.length]}${i}@${domains[i % domains.length]}`,
    type: (i % 3 === 0 ? 'soft' : 'hard') as BounceType,
    reason: reasons[i % reasons.length],
    code: `${400 + (i % 100)}`,
    campaignId: `campaign-${(i % 5) + 1}`,
    campaignName: `Campaign ${(i % 5) + 1}`,
    bouncedAt: new Date(Date.now() - i * 3600000 * Math.random() * 24),
  }));
};

const generateMockComplaints = (): ComplaintEvent[] => {
  const types = ['spam_report', 'abuse', 'unsubscribe_complaint', 'feedback_loop'];
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const names = ['user', 'contact', 'subscriber', 'customer'];

  return Array.from({ length: 8 }, (_, i) => ({
    id: `complaint-${i + 1}`,
    email: `${names[i % names.length]}${i}@${domains[i % domains.length]}`,
    type: types[i % types.length],
    campaignId: `campaign-${(i % 3) + 1}`,
    campaignName: `Campaign ${(i % 3) + 1}`,
    reportedAt: new Date(Date.now() - i * 86400000 * Math.random()),
  }));
};

const generateMockBlacklists = (): BlacklistStatus[] => {
  const blacklists = [
    { name: 'Spamhaus SBL', description: 'Spamhaus Block List' },
    { name: 'Spamhaus XBL', description: 'Exploits Block List' },
    { name: 'Spamcop', description: 'SpamCop Blocking List' },
    { name: 'Barracuda', description: 'Barracuda Reputation Block List' },
    { name: 'SORBS', description: 'Spam and Open Relay Blocking System' },
    { name: 'CBL', description: 'Composite Blocking List' },
    { name: 'UCEPROTECT', description: 'UCEPROTECT Network' },
    { name: 'Invaluement', description: 'Invaluement Anti-Spam' },
  ];

  return blacklists.map((bl, i) => ({
    id: `bl-${i + 1}`,
    name: bl.name,
    description: bl.description,
    listed: i === 6, // One blacklist marked as listed for demo
    checkedAt: new Date(),
    delistUrl: i === 6 ? 'https://example.com/delist' : undefined,
  }));
};

const generateMockRecommendations = (): Recommendation[] => {
  return [
    {
      id: 'rec-1',
      priority: 'critical',
      category: 'List Hygiene',
      title: 'Remove hard bounced emails',
      description: 'You have 18 hard bounced emails that should be removed from your list to improve deliverability.',
      impact: 'Could improve your sender score by 5-10 points',
      action: 'Remove bounced emails',
    },
    {
      id: 'rec-2',
      priority: 'high',
      category: 'Engagement',
      title: 'Improve open rates',
      description: 'Your open rate is below industry average. Consider A/B testing subject lines.',
      impact: 'Could improve engagement score by 15 points',
      action: 'Run A/B tests',
    },
    {
      id: 'rec-3',
      priority: 'medium',
      category: 'Authentication',
      title: 'Set up DMARC policy',
      description: 'Your DMARC policy is set to none. Consider upgrading to quarantine or reject.',
      impact: 'Could improve authentication score by 10 points',
      action: 'Configure DMARC',
    },
    {
      id: 'rec-4',
      priority: 'low',
      category: 'List Quality',
      title: 'Re-engage inactive subscribers',
      description: 'You have subscribers who haven\'t engaged in 90+ days. Consider a re-engagement campaign.',
      impact: 'Could improve list quality score by 8 points',
      action: 'Create re-engagement campaign',
    },
  ];
};

const generateMockTrends = (): TrendDataPoint[] => {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date,
      score: 75 + Math.random() * 15,
      inboxRate: 92 + Math.random() * 6,
      bounceRate: 2 + Math.random() * 3,
      complaintRate: 0.01 + Math.random() * 0.04,
    };
  });
};

const initialState = {
  overallScore: 0,
  scores: {
    bounceRate: 0,
    spamComplaint: 0,
    engagement: 0,
    authentication: 0,
    listQuality: 0,
  },
  metrics: {
    inboxRate: 0,
    spamRate: 0,
    bounceRate: 0,
    hardBounceRate: 0,
    softBounceRate: 0,
    complaintRate: 0,
    unsubscribeRate: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
  },
  bounces: {
    total: 0,
    hard: 0,
    soft: 0,
    byReason: {},
    recent: [],
  },
  complaints: {
    total: 0,
    rate: 0,
    byType: {},
    recent: [],
  },
  domainHealth: null,
  ipHealth: null,
  blacklistStatus: [],
  recommendations: [],
  trends: [],
  isLoading: false,
  isCheckingBlacklist: false,
  isCheckingDomain: false,
  lastUpdated: null,
  error: null,
  bounceFilter: {
    type: 'all' as const,
    dateRange: 'month' as const,
    search: '',
  },
};

export const useReputationStore = create<ReputationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      loadReputationData: async () => {
        set({ isLoading: true, error: null });

        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Generate mock data
          const bounceEvents = generateMockBounces();
          const complaintEvents = generateMockComplaints();

          const hardBounces = bounceEvents.filter((b) => b.type === 'hard').length;
          const softBounces = bounceEvents.filter((b) => b.type === 'soft').length;

          const byReason: Record<string, number> = {};
          bounceEvents.forEach((b) => {
            byReason[b.reason] = (byReason[b.reason] || 0) + 1;
          });

          const byType: Record<string, number> = {};
          complaintEvents.forEach((c) => {
            byType[c.type] = (byType[c.type] || 0) + 1;
          });

          // Calculate metrics
          const totalSent = 15420;
          const totalDelivered = 14892;
          const totalBounced = bounceEvents.length;
          const totalComplaints = complaintEvents.length;

          const metrics: DeliverabilityMetrics = {
            inboxRate: 94.2,
            spamRate: 2.1,
            bounceRate: (totalBounced / totalSent) * 100,
            hardBounceRate: (hardBounces / totalSent) * 100,
            softBounceRate: (softBounces / totalSent) * 100,
            complaintRate: (totalComplaints / totalSent) * 100,
            unsubscribeRate: 0.8,
            totalSent,
            totalDelivered,
            totalBounced,
            totalComplaints,
          };

          // Calculate scores
          const scores: ReputationScores = {
            bounceRate: calculateScoreFromRate(metrics.bounceRate, { excellent: 0.5, good: 1, fair: 2, poor: 5 }),
            spamComplaint: calculateScoreFromRate(metrics.complaintRate, { excellent: 0.01, good: 0.05, fair: 0.1, poor: 0.3 }),
            engagement: 78,
            authentication: 100,
            listQuality: 82,
          };

          // Calculate overall score
          const overallScore = Math.round(
            scores.bounceRate * 0.25 +
            scores.spamComplaint * 0.25 +
            scores.engagement * 0.2 +
            scores.authentication * 0.15 +
            scores.listQuality * 0.15
          );

          set({
            overallScore,
            scores,
            metrics,
            bounces: {
              total: totalBounced,
              hard: hardBounces,
              soft: softBounces,
              byReason,
              recent: bounceEvents,
            },
            complaints: {
              total: totalComplaints,
              rate: metrics.complaintRate,
              byType,
              recent: complaintEvents,
            },
            domainHealth: {
              domain: 'yourdomain.com',
              spf: 'valid',
              dkim: 'valid',
              dmarc: 'valid',
              age: 730,
              reputation: 'good',
              lastChecked: new Date(),
            },
            ipHealth: {
              ip: '192.168.1.100',
              type: 'shared',
              reputation: 85,
              warmingStatus: 'warmed',
              warmingProgress: 100,
              dailyVolume: 520,
              volumeTrend: 'stable',
              lastChecked: new Date(),
            },
            blacklistStatus: generateMockBlacklists(),
            recommendations: generateMockRecommendations(),
            trends: generateMockTrends(),
            isLoading: false,
            lastUpdated: new Date(),
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load reputation data',
          });
        }
      },

      refreshMetrics: async () => {
        const { loadReputationData } = get();
        await loadReputationData();
      },

      checkBlacklists: async () => {
        set({ isCheckingBlacklist: true });

        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));

          set({
            blacklistStatus: generateMockBlacklists().map((bl) => ({
              ...bl,
              checkedAt: new Date(),
            })),
            isCheckingBlacklist: false,
          });
        } catch (error) {
          set({ isCheckingBlacklist: false });
        }
      },

      checkDomainHealth: async () => {
        set({ isCheckingDomain: true });

        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));

          set({
            domainHealth: {
              domain: 'yourdomain.com',
              spf: 'valid',
              dkim: 'valid',
              dmarc: 'valid',
              age: 730,
              reputation: 'good',
              lastChecked: new Date(),
            },
            isCheckingDomain: false,
          });
        } catch (error) {
          set({ isCheckingDomain: false });
        }
      },

      removeBounce: (id: string) => {
        set((state) => ({
          bounces: {
            ...state.bounces,
            recent: state.bounces.recent.filter((b) => b.id !== id),
            total: state.bounces.total - 1,
          },
        }));
      },

      removeBouncesByType: (type: BounceType) => {
        set((state) => {
          const filtered = state.bounces.recent.filter((b) => b.type !== type);
          const removed = state.bounces.recent.length - filtered.length;

          return {
            bounces: {
              ...state.bounces,
              recent: filtered,
              total: state.bounces.total - removed,
              [type]: 0,
            },
          };
        });
      },

      removeAllBounces: () => {
        set((state) => ({
          bounces: {
            ...state.bounces,
            recent: [],
            total: 0,
            hard: 0,
            soft: 0,
            byReason: {},
          },
        }));
      },

      exportBounces: () => {
        const { getFilteredBounces } = get();
        return getFilteredBounces();
      },

      dismissRecommendation: (id: string) => {
        set((state) => ({
          recommendations: state.recommendations.map((r) =>
            r.id === id ? { ...r, dismissed: true, dismissedAt: new Date() } : r
          ),
        }));
      },

      restoreRecommendation: (id: string) => {
        set((state) => ({
          recommendations: state.recommendations.map((r) =>
            r.id === id ? { ...r, dismissed: false, dismissedAt: undefined } : r
          ),
        }));
      },

      setBounceFilter: (filter) => {
        set((state) => ({
          bounceFilter: { ...state.bounceFilter, ...filter },
        }));
      },

      getFilteredBounces: () => {
        const { bounces, bounceFilter } = get();
        let filtered = [...bounces.recent];

        // Filter by type
        if (bounceFilter.type !== 'all') {
          filtered = filtered.filter((b) => b.type === bounceFilter.type);
        }

        // Filter by date range
        const now = new Date();
        if (bounceFilter.dateRange === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          filtered = filtered.filter((b) => new Date(b.bouncedAt) >= today);
        } else if (bounceFilter.dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter((b) => new Date(b.bouncedAt) >= weekAgo);
        } else if (bounceFilter.dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter((b) => new Date(b.bouncedAt) >= monthAgo);
        }

        // Filter by search
        if (bounceFilter.search) {
          const search = bounceFilter.search.toLowerCase();
          filtered = filtered.filter(
            (b) =>
              b.email.toLowerCase().includes(search) ||
              b.reason.toLowerCase().includes(search) ||
              b.campaignName?.toLowerCase().includes(search)
          );
        }

        return filtered;
      },

      calculateOverallScore: () => {
        const { scores } = get();
        return Math.round(
          scores.bounceRate * 0.25 +
          scores.spamComplaint * 0.25 +
          scores.engagement * 0.2 +
          scores.authentication * 0.15 +
          scores.listQuality * 0.15
        );
      },

      getScoreLevel,

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'reputation-storage',
      partialize: (state) => ({
        bounceFilter: state.bounceFilter,
      }),
    }
  )
);
