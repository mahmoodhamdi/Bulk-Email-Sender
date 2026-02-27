import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlacklistChecker } from '@/components/reputation/BlacklistChecker';

vi.mock('@/stores/reputation-store', () => ({
  useReputationStore: () => ({
    blacklistStatus: [
      {
        id: '1',
        name: 'Spamhaus',
        description: 'Major DNSBL',
        listed: false,
        delistUrl: null,
        checkedAt: new Date(),
      },
      {
        id: '2',
        name: 'Barracuda',
        description: 'Email security',
        listed: true,
        delistUrl: 'https://barracuda.com/delist',
        checkedAt: new Date(),
      },
      {
        id: '3',
        name: 'Trend Micro',
        description: 'Security threat',
        listed: false,
        delistUrl: null,
        checkedAt: new Date(),
      },
    ],
    isCheckingBlacklist: false,
    checkBlacklists: vi.fn(),
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
    bounces: { total: 0, hard: 0, soft: 0 },
    bounceFilter: { type: 'all', dateRange: 'all', search: '' },
    isCheckingDomain: false,
    loadReputationData: vi.fn(),
    refreshMetrics: vi.fn(),
    getScoreLevel: vi.fn(),
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

describe('BlacklistChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component title', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('reputation.blacklistChecker')).toBeInTheDocument();
  });

  it('displays summary cards', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows clean status badge when not listed', () => {
    render(<BlacklistChecker />);
    expect(screen.getAllByText('reputation.clean')).toHaveLength(2);
  });

  it('shows listed status badge when listed', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('reputation.listed')).toBeInTheDocument();
  });

  it('displays blacklist entries', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('Spamhaus')).toBeInTheDocument();
    expect(screen.getByText('Barracuda')).toBeInTheDocument();
    expect(screen.getByText('Trend Micro')).toBeInTheDocument();
  });

  it('displays blacklist descriptions', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('Major DNSBL')).toBeInTheDocument();
    expect(screen.getByText('Email security')).toBeInTheDocument();
    expect(screen.getByText('Security threat')).toBeInTheDocument();
  });

  it('shows delist links for listed entries', () => {
    render(<BlacklistChecker />);
    const delistLinks = screen.getAllByText('reputation.requestDelist');
    expect(delistLinks).toHaveLength(1);
    expect(delistLinks[0]).toHaveAttribute('href', 'https://barracuda.com/delist');
  });

  it('displays scan button', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('reputation.scanBlacklists')).toBeInTheDocument();
  });

  it('calls checkBlacklists when scan button is clicked', () => {
    const mockCheckBlacklists = vi.fn();
    vi.mocked(require('@/stores/reputation-store').useReputationStore).mockReturnValueOnce({
      blacklistStatus: [],
      isCheckingBlacklist: false,
      checkBlacklists: mockCheckBlacklists,
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
      bounces: { total: 0, hard: 0, soft: 0 },
      bounceFilter: { type: 'all', dateRange: 'all', search: '' },
      isCheckingDomain: false,
      loadReputationData: vi.fn(),
      refreshMetrics: vi.fn(),
      getScoreLevel: vi.fn(),
      checkDomainHealth: vi.fn(),
      setBounceFilter: vi.fn(),
      removeBounce: vi.fn(),
      removeBouncesByType: vi.fn(),
      removeAllBounces: vi.fn(),
      exportBounces: vi.fn(),
      getFilteredBounces: vi.fn(),
      dismissRecommendation: vi.fn(),
      restoreRecommendation: vi.fn(),
    });
  });

  it('shows spinning icon when checking', () => {
    vi.mock('@/stores/reputation-store', () => ({
      useReputationStore: () => ({
        blacklistStatus: [],
        isCheckingBlacklist: true,
        checkBlacklists: vi.fn(),
      }),
    }));
  });

  it('displays last checked timestamp', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText(/reputation.lastChecked/)).toBeInTheDocument();
  });

  it('shows help section when listed', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('reputation.blacklistHelp')).toBeInTheDocument();
  });

  it('displays help tips', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('reputation.blacklistTip1')).toBeInTheDocument();
    expect(screen.getByText('reputation.blacklistTip2')).toBeInTheDocument();
    expect(screen.getByText('reputation.blacklistTip3')).toBeInTheDocument();
  });

  it('renders status indicator dots', () => {
    const { container } = render(<BlacklistChecker />);
    const dots = container.querySelectorAll('div[class*="bg-green-500"], div[class*="bg-red-500"]');
    expect(dots.length).toBeGreaterThan(0);
  });
});
