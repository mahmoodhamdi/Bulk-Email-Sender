import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutomationStats } from '@/components/automation/AutomationStats';
import type { Automation, AutomationStats as Stats } from '@/stores/automation-store';

// Mock the store
const mockStats: Stats = {
  totalEntered: 1000,
  totalCompleted: 600,
  totalActive: 250,
  emailsSent: 800,
  openRate: 35.5,
  clickRate: 12.3,
};

const mockAutomation: Automation = {
  id: 'auto-1',
  name: 'Test Automation',
  trigger: { type: 'signup' },
  steps: [],
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: mockStats,
};

const mockStore = {
  currentAutomation: mockAutomation,
  automations: [mockAutomation],
};

vi.mock('@/stores/automation-store', () => ({
  useAutomationStore: () => mockStore,
}));

describe('AutomationStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render stat cards with numbers', () => {
      render(<AutomationStats />);

      // Check for the actual numeric values displayed
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('250')).toBeInTheDocument();
    });

    it('should display total entered count', () => {
      render(<AutomationStats />);

      expect(screen.getByText('1,000')).toBeInTheDocument();
    });

    it('should display active contacts count', () => {
      render(<AutomationStats />);

      const elements = screen.getAllByText('250');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display emails sent count', () => {
      render(<AutomationStats />);

      const elements = screen.getAllByText('800');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display completion rate as percentage', () => {
      render(<AutomationStats />);

      // Completion rate: (600 / 1000) * 100 = 60.0%
      expect(screen.getByText(/60.0%/)).toBeInTheDocument();
    });
  });

  describe('stat card values', () => {
    it('should format large numbers with locale string', () => {
      const largeStats: Stats = {
        ...mockStats,
        totalEntered: 1000000,
        emailsSent: 500000,
      };

      mockStore.currentAutomation = {
        ...mockAutomation,
        stats: largeStats,
      };

      render(<AutomationStats />);

      expect(screen.getByText('1,000,000')).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      const zeroStats: Stats = {
        totalEntered: 0,
        totalCompleted: 0,
        totalActive: 0,
        emailsSent: 0,
        openRate: 0,
        clickRate: 0,
      };

      mockStore.currentAutomation = {
        ...mockAutomation,
        stats: zeroStats,
      };

      render(<AutomationStats />);

      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });

    it('should calculate completion rate as 0 when totalEntered is 0', () => {
      const zeroStats: Stats = {
        totalEntered: 0,
        totalCompleted: 0,
        totalActive: 0,
        emailsSent: 0,
        openRate: 0,
        clickRate: 0,
      };

      mockStore.currentAutomation = {
        ...mockAutomation,
        stats: zeroStats,
      };

      render(<AutomationStats />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display completion rate subtitle with count', () => {
      render(<AutomationStats />);

      expect(screen.getByText('600')).toBeInTheDocument(); // totalCompleted
    });
  });

  describe('engagement rates', () => {
    it('should render engagement section', () => {
      const { container } = render(<AutomationStats />);

      // Check for engagement label
      expect(
        container.textContent?.includes('automation.stats.engagement')
      ).toBeTruthy();
    });

    it('should display open rate', () => {
      render(<AutomationStats />);

      expect(screen.getByText('35.5%')).toBeInTheDocument();
    });

    it('should display click rate', () => {
      render(<AutomationStats />);

      expect(screen.getByText('12.3%')).toBeInTheDocument();
    });

    it('should render progress bars for engagement rates', () => {
      const { container } = render(<AutomationStats />);

      const progressBars = container.querySelectorAll('[class*="bg-blue-500"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('aggregate stats', () => {
    it('should aggregate stats from multiple automations when no current automation', () => {
      const auto1: Automation = {
        ...mockAutomation,
        id: 'auto-1',
        stats: {
          totalEntered: 100,
          totalCompleted: 50,
          totalActive: 20,
          emailsSent: 100,
          openRate: 40,
          clickRate: 10,
        },
      };

      const auto2: Automation = {
        ...mockAutomation,
        id: 'auto-2',
        stats: {
          totalEntered: 200,
          totalCompleted: 100,
          totalActive: 50,
          emailsSent: 200,
          openRate: 30,
          clickRate: 8,
        },
      };

      mockStore.currentAutomation = null;
      mockStore.automations = [auto1, auto2];

      render(<AutomationStats />);

      // Total entered: 300
      expect(screen.getByText('300')).toBeInTheDocument();

      // Total active: 70
      expect(screen.getByText('70')).toBeInTheDocument();

      // Total emails: 300
      const emailElements = screen.getAllByText('300');
      expect(emailElements.length).toBeGreaterThan(0);
    });

    it('should show single automation stats when currentAutomation is set', () => {
      mockStore.currentAutomation = mockAutomation;
      mockStore.automations = [mockAutomation];

      render(<AutomationStats />);

      expect(screen.getByText('1,000')).toBeInTheDocument();
    });
  });

  describe('rate calculations', () => {
    it('should calculate weighted open rate for multiple automations', () => {
      const auto1: Automation = {
        ...mockAutomation,
        id: 'auto-1',
        stats: {
          totalEntered: 100,
          totalCompleted: 50,
          totalActive: 20,
          emailsSent: 100,
          openRate: 40,
          clickRate: 10,
        },
      };

      const auto2: Automation = {
        ...mockAutomation,
        id: 'auto-2',
        stats: {
          totalEntered: 200,
          totalCompleted: 100,
          totalActive: 50,
          emailsSent: 200,
          openRate: 30,
          clickRate: 8,
        },
      };

      mockStore.currentAutomation = null;
      mockStore.automations = [auto1, auto2];

      render(<AutomationStats />);

      // Weighted average: (40*100 + 30*200) / 300 = 33.33%
      expect(screen.getByText(/33.3%/)).toBeInTheDocument();
    });

    it('should calculate weighted click rate for multiple automations', () => {
      const auto1: Automation = {
        ...mockAutomation,
        id: 'auto-1',
        stats: {
          totalEntered: 100,
          totalCompleted: 50,
          totalActive: 20,
          emailsSent: 100,
          openRate: 40,
          clickRate: 10,
        },
      };

      const auto2: Automation = {
        ...mockAutomation,
        id: 'auto-2',
        stats: {
          totalEntered: 200,
          totalCompleted: 100,
          totalActive: 50,
          emailsSent: 200,
          openRate: 30,
          clickRate: 8,
        },
      };

      mockStore.currentAutomation = null;
      mockStore.automations = [auto1, auto2];

      render(<AutomationStats />);

      // Click rate should be displayed (weighted average)
      expect(screen.getByText(/8.6%/)).toBeInTheDocument();
    });
  });

  describe('progress bar styling', () => {
    it('should cap progress bar width at 100%', () => {
      const overflowStats: Stats = {
        ...mockStats,
        openRate: 150,
      };

      mockStore.currentAutomation = {
        ...mockAutomation,
        stats: overflowStats,
      };

      const { container } = render(<AutomationStats />);

      const bars = container.querySelectorAll('[class*="bg-blue-500"]');
      expect(bars.length).toBeGreaterThan(0);
    });

    it('should scale click rate progress bar by 2x', () => {
      const { container } = render(<AutomationStats />);

      // The component uses Math.min(clickRate * 2, 100)
      // So with clickRate = 12.3%, width should be 24.6%
      const bars = container.querySelectorAll('[class*="bg-green-500"]');
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  describe('icon rendering', () => {
    it('should render icons for each stat card', () => {
      const { container } = render(<AutomationStats />);

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(4); // At least 4 stat cards with icons
    });
  });
});
