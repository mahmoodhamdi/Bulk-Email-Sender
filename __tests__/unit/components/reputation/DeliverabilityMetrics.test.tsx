import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliverabilityMetrics } from '@/components/reputation/DeliverabilityMetrics';

vi.mock('@/stores/reputation-store', () => ({
  useReputationStore: () => ({
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
    trends: [
      { date: new Date('2024-01-01'), inboxRate: 90 },
      { date: new Date('2024-01-02'), inboxRate: 91 },
      { date: new Date('2024-01-03'), inboxRate: 92.5 },
    ],
    overallScore: 85,
    scores: { bounceRate: 80, spamComplaint: 85, engagement: 90, authentication: 95, listQuality: 75 },
    domainHealth: null,
    recommendations: [],
    isLoading: false,
    lastUpdated: new Date(),
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

describe('DeliverabilityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component title', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.deliverabilityMetrics')).toBeInTheDocument();
  });

  it('displays inbox rate metric', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.inboxRate')).toBeInTheDocument();
    expect(screen.getByText('92.5%')).toBeInTheDocument();
  });

  it('displays spam rate metric', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.spamRate')).toBeInTheDocument();
    expect(screen.getByText('1.2%')).toBeInTheDocument();
  });

  it('displays bounce rate metric', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.bounceRate')).toBeInTheDocument();
    expect(screen.getByText('0.85%')).toBeInTheDocument();
  });

  it('displays complaint rate metric', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.complaintRate')).toBeInTheDocument();
    expect(screen.getByText('0.03%')).toBeInTheDocument();
  });

  it('displays hard and soft bounce breakdown', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.hardBounceRate')).toBeInTheDocument();
    expect(screen.getByText('reputation.softBounceRate')).toBeInTheDocument();
    expect(screen.getByText('0.5%')).toBeInTheDocument();
    expect(screen.getByText('0.35%')).toBeInTheDocument();
  });

  it('displays delivery funnel section', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.deliveryFunnel')).toBeInTheDocument();
  });

  it('shows sent count in delivery funnel', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.sent')).toBeInTheDocument();
    expect(screen.getByText('50,000')).toBeInTheDocument();
  });

  it('shows delivered count with percentage in delivery funnel', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.delivered')).toBeInTheDocument();
    expect(screen.getByText(/49,575/)).toBeInTheDocument();
  });

  it('shows bounced count with percentage in delivery funnel', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.bounced')).toBeInTheDocument();
    expect(screen.getByText(/425/)).toBeInTheDocument();
  });

  it('displays additional stats', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.totalSent')).toBeInTheDocument();
    expect(screen.getByText('reputation.totalDelivered')).toBeInTheDocument();
    expect(screen.getByText('reputation.totalComplaints')).toBeInTheDocument();
  });

  it('displays trend chart section when trends exist', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.deliverabilityTrend')).toBeInTheDocument();
  });

  it('shows metric cards with proper structure', () => {
    const { container } = render(<DeliverabilityMetrics />);
    const cards = container.querySelectorAll('[class*="rounded-lg"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('displays percentage values with decimal places', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('92.5%')).toBeInTheDocument();
    expect(screen.getByText('1.2%')).toBeInTheDocument();
    expect(screen.getByText('0.85%')).toBeInTheDocument();
  });

  it('renders trend indicators for metrics', () => {
    const { container } = render(<DeliverabilityMetrics />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('shows last 14 days trend chart label', () => {
    render(<DeliverabilityMetrics />);
    expect(screen.getByText('reputation.last14Days')).toBeInTheDocument();
  });
});
