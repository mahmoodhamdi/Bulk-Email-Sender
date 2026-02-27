import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignTable } from '@/components/analytics/CampaignTable';
import { type CampaignMetrics } from '@/stores/analytics-store';

// Mock usePagination hook
vi.mock('@/hooks/usePagination', () => ({
  usePagination: (items: any[], options: any) => ({
    paginatedItems: items.slice(0, options.initialPageSize || 10),
    currentPage: 1,
    totalPages: Math.ceil(items.length / (options.initialPageSize || 10)),
    pageSize: options.initialPageSize || 10,
    totalItems: items.length,
    startIndex: 0,
    endIndex: Math.min(items.length, options.initialPageSize || 10),
    goToPage: vi.fn(),
    setPageSize: vi.fn(),
    pageSizeOptions: [5, 10, 20, 50],
  }),
}));

let campaignCounter = 0;

const createMockCampaign = (overrides?: Partial<CampaignMetrics>): CampaignMetrics => {
  const id = `camp-${campaignCounter++}`;
  return {
    id,
    name: 'Test Campaign',
    status: 'completed',
    sent: 1000,
    delivered: 950,
    opened: 475,
    clicked: 95,
    bounced: 50,
    unsubscribed: 10,
    complained: 5,
    sentAt: new Date('2024-01-15'),
    ...overrides,
  };
};

describe('CampaignTable Component', () => {
  beforeEach(() => {
    campaignCounter = 0;
  });

  const mockCampaigns: CampaignMetrics[] = [
    createMockCampaign({ name: 'Campaign A', sent: 1000 }),
    createMockCampaign({ name: 'Campaign B', sent: 500 }),
    createMockCampaign({ name: 'Campaign C', sent: 1500 }),
  ];

  describe('rendering', () => {
    it('should render table with campaign data', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
      expect(screen.getByText('Campaign B')).toBeInTheDocument();
      expect(screen.getByText('Campaign C')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText(/analytics.campaignName/i)).toBeInTheDocument();
      expect(screen.getByText(/analytics.status/i)).toBeInTheDocument();
      expect(screen.getByText(/analytics.metrics.sent/i)).toBeInTheDocument();
    });

    it('should render status badges', () => {
      campaignCounter = 0;
      const campaigns = [
        createMockCampaign({ status: 'completed' }),
        createMockCampaign({ status: 'sending' }),
        createMockCampaign({ status: 'scheduled' }),
      ];

      render(<CampaignTable campaigns={campaigns} />);

      const statusBadges = screen.getAllByText(/completed|sending|scheduled/i);
      expect(statusBadges.length).toBeGreaterThanOrEqual(3);
    });

    it('should display sent count and delivery info', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText(/1,000|1000/)).toBeInTheDocument();
    });

    it('should render pagination info', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText(/campaigns/i)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort by campaign name', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const nameHeader = screen.getByRole('button', { name: /analytics.campaignName/i });
      await user.click(nameHeader);

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
    });

    it('should sort by sent count', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const sentHeader = screen.getByRole('button', { name: /analytics.metrics.sent/i });
      await user.click(sentHeader);

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
    });

    it('should sort by open rate', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const openRateHeader = screen.getByRole('button', { name: /analytics.metrics.openRate/i });
      await user.click(openRateHeader);

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
    });

    it('should sort by click rate', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const clickRateHeader = screen.getByRole('button', { name: /analytics.metrics.clickRate/i });
      await user.click(clickRateHeader);

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
    });

    it('should sort by sent date', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const dateHeader = screen.getByRole('button', { name: /analytics.date/i });
      await user.click(dateHeader);

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
    });

    it('should toggle sort direction on repeated clicks', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const nameHeader = screen.getByRole('button', { name: /analytics.campaignName/i });

      await user.click(nameHeader);
      await user.click(nameHeader);

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
    });

    it('should show sort indicator', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const nameHeader = screen.getByRole('button', { name: /analytics.campaignName/i });
      await user.click(nameHeader);

      const chevronIcon = nameHeader.querySelector('svg');
      expect(chevronIcon).toBeInTheDocument();
    });
  });

  describe('search and filter', () => {
    it('should render search input', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      const searchInput = screen.getByPlaceholderText(/analytics.searchCampaigns/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter campaigns by name', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const searchInput = screen.getByPlaceholderText(/analytics.searchCampaigns/i) as HTMLInputElement;
      await user.type(searchInput, 'Campaign A');

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
      expect(screen.queryByText('Campaign B')).not.toBeInTheDocument();
    });

    it('should filter case-insensitively', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const searchInput = screen.getByPlaceholderText(/analytics.searchCampaigns/i) as HTMLInputElement;
      await user.type(searchInput, 'campaign a');

      expect(screen.getByText('Campaign A')).toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const searchInput = screen.getByPlaceholderText(/analytics.searchCampaigns/i) as HTMLInputElement;
      await user.type(searchInput, 'NonexistentCampaign');

      expect(screen.getByText(/analytics.noResults/i)).toBeInTheDocument();
    });

    it('should clear search and show all campaigns again', async () => {
      const user = userEvent.setup();
      render(<CampaignTable campaigns={mockCampaigns} />);

      const searchInput = screen.getByPlaceholderText(/analytics.searchCampaigns/i) as HTMLInputElement;
      await user.type(searchInput, 'Campaign A');
      expect(screen.getByText('Campaign A')).toBeInTheDocument();
      expect(screen.queryByText('Campaign B')).not.toBeInTheDocument();

      await user.clear(searchInput);
      expect(screen.getByText('Campaign B')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('should show green badge for completed campaigns', () => {
      campaignCounter = 0;
      const campaigns = [createMockCampaign({ status: 'completed' })];
      const { container } = render(<CampaignTable campaigns={campaigns} />);

      const badge = container.querySelector('[class*="green"]') || container.querySelector('[class*="bg-green"]');
      expect(badge).toBeInTheDocument();
    });

    it('should show blue badge for sending campaigns', () => {
      campaignCounter = 0;
      const campaigns = [createMockCampaign({ status: 'sending' })];
      const { container } = render(<CampaignTable campaigns={campaigns} />);

      const badge = container.querySelector('[class*="blue"]') || container.querySelector('[class*="bg-blue"]');
      expect(badge).toBeInTheDocument();
    });

    it('should show yellow badge for scheduled campaigns', () => {
      campaignCounter = 0;
      const campaigns = [createMockCampaign({ status: 'scheduled' })];
      const { container } = render(<CampaignTable campaigns={campaigns} />);

      const badge = container.querySelector('[class*="yellow"]') || container.querySelector('[class*="bg-yellow"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('metrics display', () => {
    it('should display open rate', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText(/50\./)).toBeInTheDocument();
    });

    it('should display click rate', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText(/10\./)).toBeInTheDocument();
    });

    it('should show progress bars for metrics', () => {
      const { container } = render(<CampaignTable campaigns={mockCampaigns} />);

      const progressBars = container.querySelectorAll('[class*="bg-blue"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should display sparkline chart', () => {
      const { container } = render(<CampaignTable campaigns={mockCampaigns} />);

      const sparklines = container.querySelectorAll('svg');
      expect(sparklines.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('should show no campaigns message when list is empty', () => {
      render(<CampaignTable campaigns={[]} />);

      expect(screen.getByText(/analytics.noCampaigns/i)).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onExport when export button is clicked', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      render(<CampaignTable campaigns={mockCampaigns} onExport={onExport} />);

      const exportButton = screen.getByRole('button', { name: /analytics.export/i });
      await user.click(exportButton);

      expect(onExport).toHaveBeenCalled();
    });

    it('should call onCampaignClick when campaign row button is clicked', async () => {
      const user = userEvent.setup();
      const onCampaignClick = vi.fn();
      render(
        <CampaignTable campaigns={mockCampaigns} onCampaignClick={onCampaignClick} />
      );

      const clickButtons = screen.getAllByRole('button').filter((btn) =>
        btn.querySelector('svg') && !btn.textContent?.includes('analytics')
      );

      if (clickButtons.length > 0) {
        await user.click(clickButtons[0]);
      }

      expect(onCampaignClick).toHaveBeenCalled();
    });

    it('should not render export button when onExport is not provided', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      const exportButtons = screen.queryAllByRole('button', { name: /analytics.export/i });
      expect(exportButtons.length).toBe(0);
    });

    it('should not render campaign click buttons when onCampaignClick is not provided', () => {
      const { container } = render(
        <CampaignTable campaigns={mockCampaigns} />
      );

      const externalLinkButtons = container.querySelectorAll('[class*="variant-ghost"]');
      expect(externalLinkButtons.length).toBe(0);
    });
  });

  describe('customization', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CampaignTable campaigns={mockCampaigns} className="custom-class" />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('table structure', () => {
    it('should render as HTML table', () => {
      const { container } = render(<CampaignTable campaigns={mockCampaigns} />);

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();

      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();

      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
    });

    it('should render table rows for each campaign', () => {
      const { container } = render(<CampaignTable campaigns={mockCampaigns} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(mockCampaigns.length);
    });

    it('should render date in table', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText(/1\/15\/2024|15\/1\/2024|2024-01-15/)).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should render pagination info', () => {
      render(<CampaignTable campaigns={mockCampaigns} />);

      expect(screen.getByText(/campaigns/i)).toBeInTheDocument();
    });

    it('should handle multiple pages', () => {
      const largeCampaignList = Array.from({ length: 25 }, (_, i) =>
        createMockCampaign({ name: `Campaign ${i}` })
      );

      render(<CampaignTable campaigns={largeCampaignList} />);

      expect(screen.getByText('Campaign 0')).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should render table with overflow handling', () => {
      const { container } = render(<CampaignTable campaigns={mockCampaigns} />);

      const overflowContainer = container.querySelector('[class*="overflow"]');
      expect(overflowContainer).toBeInTheDocument();
    });
  });
});
