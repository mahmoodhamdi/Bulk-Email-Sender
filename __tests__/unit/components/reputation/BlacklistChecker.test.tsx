import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlacklistChecker } from '@/components/reputation/BlacklistChecker';

const mockBlacklistData = [
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
];

const mockReputationStore = {
  blacklistStatus: mockBlacklistData,
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
    unsubscribeRate: 0.1,
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
  bounces: { total: 0, hard: 0, soft: 0, byReason: {}, recent: [] },
  complaints: { total: 0, rate: 0, byType: {}, recent: [] },
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
  calculateOverallScore: vi.fn(),
  error: null,
  reset: vi.fn(),
};

vi.mock('@/stores/reputation-store', () => ({
  useReputationStore: vi.fn(() => mockReputationStore),
}));

describe('BlacklistChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component title', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('reputation.blacklistChecker')).toBeInTheDocument();
  });

  it('displays summary cards with correct counts', () => {
    render(<BlacklistChecker />);
    // listedCount = 1 (only Barracuda), cleanCount = 2, total = 3
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
    const delistLinks = screen.getAllByRole('link');
    const delistLink = delistLinks.find((link) => link.textContent === 'reputation.requestDelist');
    expect(delistLink).toBeInTheDocument();
    expect(delistLink).toHaveAttribute('href', 'https://barracuda.com/delist');
  });

  it('displays scan button', () => {
    render(<BlacklistChecker />);
    expect(screen.getByText('reputation.scanBlacklists')).toBeInTheDocument();
  });

  it('calls checkBlacklists when scan button is clicked', async () => {
    const user = userEvent.setup();
    render(<BlacklistChecker />);
    const scanButton = screen.getByText('reputation.scanBlacklists');
    await user.click(scanButton);
    expect(mockReputationStore.checkBlacklists).toHaveBeenCalled();
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
    // Tips are inside <li> elements with bullet points
    expect(screen.getByText(/reputation.blacklistTip1/)).toBeInTheDocument();
    expect(screen.getByText(/reputation.blacklistTip2/)).toBeInTheDocument();
    expect(screen.getByText(/reputation.blacklistTip3/)).toBeInTheDocument();
  });

  it('renders status indicator dots', () => {
    const { container } = render(<BlacklistChecker />);
    const dots = container.querySelectorAll('div[class*="bg-green-500"], div[class*="bg-red-500"]');
    expect(dots.length).toBeGreaterThan(0);
  });
});
