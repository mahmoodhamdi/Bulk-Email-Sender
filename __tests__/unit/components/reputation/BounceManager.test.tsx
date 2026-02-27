import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BounceManager } from '@/components/reputation/BounceManager';

vi.mock('@/stores/reputation-store', () => ({
  useReputationStore: () => ({
    bounces: {
      total: 425,
      hard: 300,
      soft: 125,
    },
    bounceFilter: {
      type: 'all',
      dateRange: 'all',
      search: '',
    },
    setBounceFilter: vi.fn(),
    getFilteredBounces: vi.fn(() => [
      {
        id: '1',
        email: 'invalid@example.com',
        type: 'hard',
        reason: 'Invalid address',
        code: '550',
        campaignName: 'Campaign 1',
        bouncedAt: new Date('2024-01-10'),
      },
      {
        id: '2',
        email: 'temp@example.com',
        type: 'soft',
        reason: 'Mailbox full',
        code: '452',
        campaignName: 'Campaign 2',
        bouncedAt: new Date('2024-01-11'),
      },
    ]),
    removeBounce: vi.fn(),
    removeBouncesByType: vi.fn(),
    removeAllBounces: vi.fn(),
    exportBounces: vi.fn(),
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
    isCheckingBlacklist: false,
    isCheckingDomain: false,
    loadReputationData: vi.fn(),
    refreshMetrics: vi.fn(),
    getScoreLevel: vi.fn(),
    checkBlacklists: vi.fn(),
    checkDomainHealth: vi.fn(),
    dismissRecommendation: vi.fn(),
    restoreRecommendation: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePagination', () => ({
  usePagination: () => ({
    paginatedItems: [
      {
        id: '1',
        email: 'invalid@example.com',
        type: 'hard',
        reason: 'Invalid address',
        code: '550',
        campaignName: 'Campaign 1',
        bouncedAt: new Date('2024-01-10'),
      },
      {
        id: '2',
        email: 'temp@example.com',
        type: 'soft',
        reason: 'Mailbox full',
        code: '452',
        campaignName: 'Campaign 2',
        bouncedAt: new Date('2024-01-11'),
      },
    ],
    currentPage: 1,
    totalPages: 1,
    pageSize: 25,
    totalItems: 2,
    startIndex: 1,
    endIndex: 2,
    goToPage: vi.fn(),
    setPageSize: vi.fn(),
    pageSizeOptions: [10, 25, 50, 100],
  }),
}));

describe('BounceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component title', () => {
    render(<BounceManager />);
    expect(screen.getByText('reputation.bounceManager')).toBeInTheDocument();
  });

  it('displays bounce statistics cards', () => {
    render(<BounceManager />);
    expect(screen.getByText('reputation.totalBounces')).toBeInTheDocument();
    expect(screen.getByText('reputation.hardBounces')).toBeInTheDocument();
    expect(screen.getByText('reputation.softBounces')).toBeInTheDocument();
    expect(screen.getByText('425')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    render(<BounceManager />);
    expect(screen.getByDisplayValue('all')).toBeInTheDocument();
  });

  it('displays export button', () => {
    render(<BounceManager />);
    expect(screen.getByText('reputation.export')).toBeInTheDocument();
  });

  it('displays bounce entries in table', () => {
    render(<BounceManager />);
    expect(screen.getByText('invalid@example.com')).toBeInTheDocument();
    expect(screen.getByText('temp@example.com')).toBeInTheDocument();
  });

  it('shows hard bounce type badge', () => {
    render(<BounceManager />);
    expect(screen.getByText('hard')).toBeInTheDocument();
  });

  it('shows soft bounce type badge', () => {
    render(<BounceManager />);
    expect(screen.getByText('soft')).toBeInTheDocument();
  });

  it('displays bounce reasons', () => {
    render(<BounceManager />);
    expect(screen.getByText('Invalid address')).toBeInTheDocument();
    expect(screen.getByText('Mailbox full')).toBeInTheDocument();
  });

  it('displays campaign names', () => {
    render(<BounceManager />);
    expect(screen.getByText('Campaign 1')).toBeInTheDocument();
    expect(screen.getByText('Campaign 2')).toBeInTheDocument();
  });

  it('renders date column', () => {
    render(<BounceManager />);
    expect(screen.getByText('reputation.date')).toBeInTheDocument();
  });

  it('displays remove button for each bounce', () => {
    const { container } = render(<BounceManager />);
    const deleteButtons = container.querySelectorAll('button[class*="text-gray-400"]');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('renders checkboxes for selection', () => {
    const { container } = render(<BounceManager />);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('displays search input', () => {
    render(<BounceManager />);
    expect(screen.getByPlaceholderText('reputation.searchBounces')).toBeInTheDocument();
  });

  it('displays filter dropdowns', () => {
    render(<BounceManager />);
    const selects = screen.getAllByDisplayValue('all');
    expect(selects.length).toBeGreaterThan(1);
  });
});
