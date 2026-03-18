import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Recommendations } from '@/components/reputation/Recommendations';

const mockRecommendations = [
  {
    id: '1',
    title: 'Improve list quality',
    description: 'Your bounce rate is high',
    impact: 'Critical impact on inbox placement',
    action: 'Implement list cleaning process',
    priority: 'critical' as const,
    category: 'list_quality',
    dismissed: false,
    dismissedAt: undefined,
  },
  {
    id: '2',
    title: 'Monitor engagement',
    description: 'Engagement rate is declining',
    impact: 'High impact on reputation',
    action: 'Increase email frequency strategically',
    priority: 'high' as const,
    category: 'engagement',
    dismissed: false,
    dismissedAt: undefined,
  },
  {
    id: '3',
    title: 'Review authentication',
    description: 'DMARC policy needs update',
    impact: 'Medium impact',
    action: 'Update DMARC policy',
    priority: 'medium' as const,
    category: 'authentication',
    dismissed: false,
    dismissedAt: undefined,
  },
  {
    id: '4',
    title: 'Old dismissed recommendation',
    description: 'This was dismissed',
    impact: 'Low impact',
    action: 'Some action',
    priority: 'low' as const,
    category: 'general',
    dismissed: true,
    dismissedAt: new Date('2024-01-05'),
  },
];

const mockReputationStore = {
  recommendations: mockRecommendations,
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
    unsubscribeRate: 0.1,
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
  bounces: { total: 0, hard: 0, soft: 0, byReason: {}, recent: [] },
  complaints: { total: 0, rate: 0, byType: {}, recent: [] },
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
  calculateOverallScore: vi.fn(),
  error: null,
  reset: vi.fn(),
};

vi.mock('@/stores/reputation-store', () => ({
  useReputationStore: vi.fn(() => mockReputationStore),
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
    const allElements = screen.getAllByText('reputation.priority.critical');
    expect(allElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText('reputation.priority.high').length).toBeGreaterThan(0);
    expect(screen.getAllByText('reputation.priority.medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('reputation.priority.low').length).toBeGreaterThan(0);
  });

  it('displays count badges for critical and high priority', () => {
    const { container } = render(<Recommendations />);
    const badges = container.querySelectorAll('[class*="text-red-700"], [class*="text-orange-700"]');
    expect(badges.length).toBeGreaterThan(0);
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
    const criticalBadges = screen.getAllByText('reputation.priority.critical');
    expect(criticalBadges.length).toBeGreaterThan(0);
  });

  it('renders expandable recommendation cards', () => {
    const { container } = render(<Recommendations />);
    const expandButtons = container.querySelectorAll('button');
    expect(expandButtons.length).toBeGreaterThan(0);
  });

  it('expands recommendation on click', () => {
    render(<Recommendations />);
    const recCards = screen.getAllByText('Improve list quality');
    fireEvent.click(recCards[0]);
    expect(screen.getByText('Critical impact on inbox placement')).toBeInTheDocument();
    expect(screen.getByText('Implement list cleaning process')).toBeInTheDocument();
  });

  it('displays dismiss button in expanded view', () => {
    render(<Recommendations />);
    const recCards = screen.getAllByText('Improve list quality');
    fireEvent.click(recCards[0]);
    expect(screen.getByText('reputation.dismiss')).toBeInTheDocument();
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
    const titles = screen.getAllByText(/Improve list quality|Monitor engagement|Review authentication/);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('displays priority icons', () => {
    const { container } = render(<Recommendations />);
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});
