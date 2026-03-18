import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainHealth } from '@/components/reputation/DomainHealth';

const mockReputationStore = {
  domainHealth: {
    domain: 'example.com',
    spf: 'valid',
    dkim: 'valid',
    dmarc: 'invalid',
    reputation: 'good',
    age: 365,
    lastChecked: new Date(),
  },
  ipHealth: {
    ip: '192.168.1.1',
    type: 'dedicated',
    reputation: 85,
    warmingStatus: 'warming',
    warmingProgress: 100,
    dailyVolume: 10000,
    volumeTrend: 'increasing',
    lastChecked: new Date(),
  },
  isCheckingDomain: false,
  checkDomainHealth: vi.fn(),
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
  recommendations: [],
  isLoading: false,
  lastUpdated: new Date(),
  trends: [],
  blacklistStatus: [],
  bounces: { total: 0, hard: 0, soft: 0, byReason: {}, recent: [] },
  complaints: { total: 0, rate: 0, byType: {}, recent: [] },
  bounceFilter: { type: 'all', dateRange: 'all', search: '' },
  isCheckingBlacklist: false,
  loadReputationData: vi.fn(),
  refreshMetrics: vi.fn(),
  getScoreLevel: vi.fn(),
  checkBlacklists: vi.fn(),
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

describe('DomainHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component title', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.domainHealth')).toBeInTheDocument();
  });

  it('displays domain name', () => {
    render(<DomainHealth />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('displays domain reputation badge', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.levels.good')).toBeInTheDocument();
  });

  it('displays domain age', () => {
    render(<DomainHealth />);
    expect(screen.getByText(/reputation.domainAge/)).toBeInTheDocument();
  });

  it('renders SPF authentication card', () => {
    render(<DomainHealth />);
    expect(screen.getByText('SPF (Sender Policy Framework)')).toBeInTheDocument();
  });

  it('renders DKIM authentication card', () => {
    render(<DomainHealth />);
    expect(screen.getByText('DKIM (DomainKeys Identified Mail)')).toBeInTheDocument();
  });

  it('renders DMARC authentication card', () => {
    render(<DomainHealth />);
    expect(screen.getByText('DMARC (Domain-based Message Authentication)')).toBeInTheDocument();
  });

  it('displays SPF status as valid', () => {
    render(<DomainHealth />);
    const statusElements = screen.getAllByText('reputation.authStatus.valid');
    expect(statusElements.length).toBeGreaterThanOrEqual(2);
  });

  it('displays DKIM status with appropriate icon', () => {
    render(<DomainHealth />);
    const statusElements = screen.getAllByText(/reputation.authStatus/);
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('displays IP health section', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.ipHealth')).toBeInTheDocument();
  });

  it('displays IP address', () => {
    render(<DomainHealth />);
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });

  it('displays IP type', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.ipType')).toBeInTheDocument();
    expect(screen.getByText('dedicated')).toBeInTheDocument();
  });

  it('displays IP reputation score', () => {
    render(<DomainHealth />);
    expect(screen.getByText('85/100')).toBeInTheDocument();
  });

  it('displays daily volume', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.dailyVolume')).toBeInTheDocument();
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });

  it('displays volume trend indicator', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.trend.increasing')).toBeInTheDocument();
  });

  it('renders recheck button', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.recheck')).toBeInTheDocument();
  });

  it('displays email authentication section title', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.emailAuthentication')).toBeInTheDocument();
  });

  it('shows auth descriptions', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.spfDescription')).toBeInTheDocument();
    expect(screen.getByText('reputation.dkimDescription')).toBeInTheDocument();
    expect(screen.getByText('reputation.dmarcDescription')).toBeInTheDocument();
  });

  it('displays warming status when warming', () => {
    render(<DomainHealth />);
    expect(screen.getByText('reputation.warming.warming')).toBeInTheDocument();
  });

  it('displays learn more links for invalid records', () => {
    render(<DomainHealth />);
    const links = screen.getAllByText('reputation.learnMore');
    expect(links.length).toBeGreaterThan(0);
  });

  it('displays last checked timestamp', () => {
    render(<DomainHealth />);
    expect(screen.getByText(/reputation.lastChecked/)).toBeInTheDocument();
  });
});
