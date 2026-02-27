import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Recommendations } from '@/components/reputation/Recommendations';

vi.mock('@/stores/reputation-store', () => ({
  useReputationStore: () => ({
    recommendations: [
      {
        id: '1',
        title: 'Improve list quality',
        description: 'Your bounce rate is high',
        impact: 'Critical impact on inbox placement',
        action: 'Implement list cleaning process',
        priority: 'critical',
        category: 'list_quality',
        dismissed: false,
        dismissedAt: null,
      },
      {
        id: '2',
        title: 'Monitor engagement',
        description: 'Engagement rate is declining',
        impact: 'High impact on reputation',
        action: 'Increase email frequency strategically',
        priority: 'high',
        category: 'engagement',
        dismissed: false,
        dismissedAt: null,
      },
      {
        id: '3',
        title: 'Review authentication',
        description: 'DMARC policy needs update',
        impact: 'Medium impact',
        action: 'Update DMARC policy',
        priority: 'medium',
        category: 'authentication',
        dismissed: false,
        dismissedAt: null,
      },
      {
        id: '4',
        title: 'Old dismissed recommendation',
        description: 'This was dismissed',
        impact: 'Low impact',
        action: 'Some action',
        priority: 'low',
        category: 'general',
        dismissed: true,
        dismissedAt: new Date('2024-01-05'),
      },
    ],
    dismissRecommendation: vi.fn(),
    restoreRecommendation: vi.fn(),
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
    getScoreLevel: vi.fn(),
    checkBlacklists: vi.fn(),
    checkDomainHealth: vi.fn(),
    setBounceFilter: vi.fn(),
    removeBounce: vi.fn(),
    removeBouncesByType: vi.fn(),
    removeAllBounces: vi.fn(),
    exportBounces: vi.fn(),
    getFilteredBounces: vi.fn(),
  }),
}));

describe('Recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component title', () => {
    render(<Recommendations />);
    expect(screen.getByText('reputation.recommendations')).toBeInTheDocument();
  });

  it('displays recommendation description', () => {
    render(<Recommendations />);
    expect(screen.getByText('reputation.recommendationsDescription')).toBeInTheDocument();
  });

  it('shows summary stats for each priority level', () => {
    render(<Recommendations />);
    expect(screen.getByText('reputation.priority.critical')).toBeInTheDocument();
    expect(screen.getByText('reputation.priority.high')).toBeInTheDocument();
    expect(screen.getByText('reputation.priority.medium')).toBeInTheDocument();
    expect(screen.getByText('reputation.priority.low')).toBeInTheDocument();
  });

  it('displays count badges for critical and high priority', () => {
    render(<Recommendations />);
    const criticalBadge = screen.getByText(/reputation.critical/);
    const highBadge = screen.getByText(/reputation.high/);
    expect(criticalBadge).toBeInTheDocument();
    expect(highBadge).toBeInTheDocument();
  });

  it('displays active recommendations', () => {
    render(<Recommendations />);
    expect(screen.getByText('Improve list quality')).toBeInTheDocument();
    expect(screen.getByText('Monitor engagement')).toBeInTheDocument();
    expect(screen.getByText('Review authentication')).toBeInTheDocument();
  });

  it('displays recommendation categories', () => {
    render(<Recommendations />);
    expect(screen.getByText('list_quality')).toBeInTheDocument();
    expect(screen.getByText('engagement')).toBeInTheDocument();
    expect(screen.getByText('authentication')).toBeInTheDocument();
  });

  it('displays priority badges on recommendations', () => {
    render(<Recommendations />);
    expect(screen.getByText('reputation.priority.critical')).toBeInTheDocument();
    expect(screen.getByText('reputation.priority.high')).toBeInTheDocument();
  });

  it('renders expandable recommendation cards', () => {
    const { container } = render(<Recommendations />);
    const expandButtons = container.querySelectorAll('svg[class*="w-5"]');
    expect(expandButtons.length).toBeGreaterThan(0);
  });

  it('expands recommendation on click', () => {
    render(<Recommendations />);
    const recommendations = screen.getAllByText(/Improve list quality/);
    const recCard = recommendations[0].closest('[class*="cursor-pointer"]');
    if (recCard) {
      fireEvent.click(recCard);
      expect(screen.getByText('Critical impact on inbox placement')).toBeInTheDocument();
      expect(screen.getByText('Implement list cleaning process')).toBeInTheDocument();
    }
  });

  it('displays dismiss button in expanded view', () => {
    render(<Recommendations />);
    const recommendations = screen.getAllByText(/Improve list quality/);
    const recCard = recommendations[0].closest('[class*="cursor-pointer"]');
    if (recCard) {
      fireEvent.click(recCard);
      expect(screen.getByText('reputation.dismiss')).toBeInTheDocument();
    }
  });

  it('shows dismissed recommendations section', () => {
    render(<Recommendations />);
    expect(screen.getByText(/reputation.showDismissed/)).toBeInTheDocument();
  });

  it('expands dismissed recommendations when clicked', () => {
    render(<Recommendations />);
    const dismissedToggle = screen.getByText(/reputation.showDismissed/);
    fireEvent.click(dismissedToggle);
    expect(screen.getByText('Old dismissed recommendation')).toBeInTheDocument();
  });

  it('displays restore button for dismissed recommendations', () => {
    render(<Recommendations />);
    const dismissedToggle = screen.getByText(/reputation.showDismissed/);
    fireEvent.click(dismissedToggle);
    expect(screen.getByText('reputation.restore')).toBeInTheDocument();
  });

  it('shows dismissed date for dismissed recommendations', () => {
    render(<Recommendations />);
    const dismissedToggle = screen.getByText(/reputation.showDismissed/);
    fireEvent.click(dismissedToggle);
    const dismissedDate = screen.getByText(/1\/5\/2024/);
    expect(dismissedDate).toBeInTheDocument();
  });

  it('sorts recommendations by priority', () => {
    render(<Recommendations />);
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles[0]).toHaveTextContent('Improve list quality');
    expect(titles[1]).toHaveTextContent('Monitor engagement');
  });

  it('displays priority icons', () => {
    const { container } = render(<Recommendations />);
    const icons = container.querySelectorAll('svg[class*="w-6"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no active recommendations', () => {
    vi.mocked(require('@/stores/reputation-store').useReputationStore).mockReturnValueOnce({
      recommendations: [],
      dismissRecommendation: vi.fn(),
      restoreRecommendation: vi.fn(),
      overallScore: 100,
      scores: { bounceRate: 100, spamComplaint: 100, engagement: 100, authentication: 100, listQuality: 100 },
      metrics: {
        inboxRate: 99,
        spamRate: 0.1,
        bounceRate: 0.01,
        complaintRate: 0.001,
        hardBounceRate: 0,
        softBounceRate: 0.01,
        totalSent: 50000,
        totalDelivered: 49999,
        totalBounced: 1,
        totalComplaints: 0,
      },
      domainHealth: null,
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
      getScoreLevel: vi.fn(),
      checkBlacklists: vi.fn(),
      checkDomainHealth: vi.fn(),
      setBounceFilter: vi.fn(),
      removeBounce: vi.fn(),
      removeBouncesByType: vi.fn(),
      removeAllBounces: vi.fn(),
      exportBounces: vi.fn(),
      getFilteredBounces: vi.fn(),
    });
  });
});
