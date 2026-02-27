import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReputationDashboard } from '@/components/reputation/ReputationDashboard';

vi.mock('@/stores/reputation-store', () => ({
  useReputationStore: () => ({
    overallScore: 85,
    scores: {
      bounceRate: 80,
      spamComplaint: 85,
      engagement: 90,
      authentication: 95,
      listQuality: 75,
    },
    metrics: {
      inboxRate: 92.5,
      spamRate: 1.2,
      bounceRate: 0.85,
      complaintRate: 0.03,
      hardBounceRate: 0.5,
      softBounceRate: 0.35,
      totalSent: 50000,
      totalDelivered: 49575,
      totalBounced: 425,
      totalComplaints: 15,
    },
    domainHealth: {
      domain: 'example.com',
      spf: 'valid',
      dkim: 'valid',
      dmarc: 'valid',
      reputation: 'good',
      age: 365,
      lastChecked: new Date(),
    },
    recommendations: [
      {
        id: '1',
        title: 'Review engagement metrics',
        description: 'Your engagement rate is below average',
        priority: 'high',
        category: 'engagement',
        impact: 'High impact on deliverability',
        action: 'Increase email frequency',
        dismissed: false,
        dismissedAt: null,
      },
      {
        id: '2',
        title: 'Monitor bounce rate',
        description: 'Consider list cleaning',
        priority: 'medium',
        category: 'list_quality',
        impact: 'Medium impact',
        action: 'Clean inactive subscribers',
        dismissed: true,
        dismissedAt: new Date(),
      },
    ],
    isLoading: false,
    lastUpdated: new Date(),
    trends: [],
    ipHealth: null,
    blacklistStatus: [],
    bounces: { total: 0, hard: 0, soft: 0 },
    bounceFilter: { type: 'all', dateRange: 'all', search: '' },
    isCheckingBlacklist: false,
    isCheckingDomain: false,
    loadReputationData: vi.fn(),
    refreshMetrics: vi.fn(),
    getScoreLevel: (score: number) => {
      if (score >= 90) return 'excellent';
      if (score >= 75) return 'good';
      if (score >= 50) return 'fair';
      if (score >= 25) return 'poor';
      return 'critical';
    },
    checkBlacklists: vi.fn(),
    checkDomainHealth: vi.fn(),
    setBounceFilter: vi.fn(),
    removeBounce: vi.fn(),
    removeBouncesByType: vi.fn(),
    removeAllBounces: vi.fn(),
    exportBounces: vi.fn(),
    getFilteredBounces: vi.fn(() => []),
    dismissRecommendation: vi.fn(),
    restoreRecommendation: vi.fn(),
  }),
}));

describe('ReputationDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the overall score gauge', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('renders score components breakdown', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText('reputation.bounceRateScore')).toBeInTheDocument();
    expect(screen.getByText('reputation.spamComplaintScore')).toBeInTheDocument();
    expect(screen.getByText('reputation.engagementScore')).toBeInTheDocument();
    expect(screen.getByText('reputation.authenticationScore')).toBeInTheDocument();
    expect(screen.getByText('reputation.listQualityScore')).toBeInTheDocument();
  });

  it('renders quick metrics cards', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText('92.5%')).toBeInTheDocument();
    expect(screen.getByText('1.2%')).toBeInTheDocument();
    expect(screen.getByText('0.85%')).toBeInTheDocument();
    expect(screen.getByText('0.03%')).toBeInTheDocument();
  });

  it('displays reputation level badge', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText('reputation.levels.good')).toBeInTheDocument();
  });

  it('renders domain health section with auth badges', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText('SPF')).toBeInTheDocument();
    expect(screen.getByText('DKIM')).toBeInTheDocument();
    expect(screen.getByText('DMARC')).toBeInTheDocument();
  });

  it('renders active recommendations preview', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText('Review engagement metrics')).toBeInTheDocument();
  });

  it('shows critical count badge when recommendations exist', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText('reputation.critical')).toBeInTheDocument();
  });

  it('displays refresh button', () => {
    render(<ReputationDashboard />);
    const refreshBtn = screen.getByText('reputation.refresh');
    expect(refreshBtn).toBeInTheDocument();
  });

  it('renders loading state when loading', () => {
    vi.mock('@/stores/reputation-store', () => ({
      useReputationStore: () => ({
        isLoading: true,
        lastUpdated: null,
        overallScore: 0,
        scores: { bounceRate: 0, spamComplaint: 0, engagement: 0, authentication: 0, listQuality: 0 },
        metrics: {
          inboxRate: 0,
          spamRate: 0,
          bounceRate: 0,
          complaintRate: 0,
          hardBounceRate: 0,
          softBounceRate: 0,
          totalSent: 0,
          totalDelivered: 0,
          totalBounced: 0,
          totalComplaints: 0,
        },
        domainHealth: null,
        recommendations: [],
        trends: [],
        ipHealth: null,
        blacklistStatus: [],
        bounces: { total: 0, hard: 0, soft: 0 },
        bounceFilter: { type: 'all', dateRange: 'all', search: '' },
        isCheckingBlacklist: false,
        isCheckingDomain: false,
        loadReputationData: vi.fn(),
        refreshMetrics: vi.fn(),
        getScoreLevel: vi.fn(),
        checkBlacklists: vi.fn(),
        checkDomainHealth: vi.fn(),
        setBounceFilter: vi.fn(),
        removeBounce: vi.fn(),
        removeBouncesByType: vi.fn(),
        removeAllBounces: vi.fn(),
        exportBounces: vi.fn(),
        getFilteredBounces: vi.fn(),
        dismissRecommendation: vi.fn(),
        restoreRecommendation: vi.fn(),
      }),
    }));
  });

  it('displays last updated timestamp', () => {
    render(<ReputationDashboard />);
    expect(screen.getByText(/reputation.lastUpdated/)).toBeInTheDocument();
  });

  it('shows no recommendations message when all dismissed', () => {
    vi.mock('@/stores/reputation-store', () => ({
      useReputationStore: () => ({
        overallScore: 85,
        scores: { bounceRate: 80, spamComplaint: 85, engagement: 90, authentication: 95, listQuality: 75 },
        metrics: {
          inboxRate: 92.5,
          spamRate: 1.2,
          bounceRate: 0.85,
          complaintRate: 0.03,
          hardBounceRate: 0.5,
          softBounceRate: 0.35,
          totalSent: 50000,
          totalDelivered: 49575,
          totalBounced: 425,
          totalComplaints: 15,
        },
        domainHealth: null,
        recommendations: [],
        isLoading: false,
        lastUpdated: new Date(),
        trends: [],
        ipHealth: null,
        blacklistStatus: [],
        bounces: { total: 0, hard: 0, soft: 0 },
        bounceFilter: { type: 'all', dateRange: 'all', search: '' },
        isCheckingBlacklist: false,
        isCheckingDomain: false,
        loadReputationData: vi.fn(),
        refreshMetrics: vi.fn(),
        getScoreLevel: vi.fn(() => 'good'),
        checkBlacklists: vi.fn(),
        checkDomainHealth: vi.fn(),
        setBounceFilter: vi.fn(),
        removeBounce: vi.fn(),
        removeBouncesByType: vi.fn(),
        removeAllBounces: vi.fn(),
        exportBounces: vi.fn(),
        getFilteredBounces: vi.fn(),
        dismissRecommendation: vi.fn(),
        restoreRecommendation: vi.fn(),
      }),
    }));
  });
});
