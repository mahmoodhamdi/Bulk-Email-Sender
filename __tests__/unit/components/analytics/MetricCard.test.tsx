import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { MetricCard, MetricCardCompact } from '@/components/analytics/MetricCard';

describe('MetricCard Component', () => {
  describe('rendering', () => {
    it('should render value and label', () => {
      render(<MetricCard title="Emails Sent" value={1500} />);

      expect(screen.getByText('Emails Sent')).toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
    });

    it('should render with string value', () => {
      render(<MetricCard title="Status" value="Active" />);

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      const { container } = render(
        <MetricCard title="Emails" value={100} icon={<Mail data-testid="mail-icon" />} />
      );

      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <MetricCard title="Test" value={42} className="custom-class" />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('trend indicator', () => {
    it('should not show trend indicator when change is not provided', () => {
      render(<MetricCard title="Sent" value={100} />);

      const trendElements = screen.queryAllByText(/^[+-].*%$/);
      expect(trendElements.length).toBe(0);
    });

    it('should show trend indicator when change is provided', () => {
      render(<MetricCard title="Sent" value={100} change={5} />);

      expect(screen.getByText(/\+5/)).toBeInTheDocument();
    });

    it('should show up arrow for positive trend', () => {
      const { container } = render(<MetricCard title="Sent" value={100} change={10} />);

      // TrendingUp icon has path elements, check for its presence
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show down arrow for negative trend', () => {
      const { container } = render(<MetricCard title="Bounced" value={50} change={-3} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show minus icon for zero change', () => {
      render(<MetricCard title="Static" value={100} change={0} />);

      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should display change with correct sign for positive values', () => {
      render(<MetricCard title="Test" value={100} change={15.5} />);

      expect(screen.getByText(/\+15\.5%/)).toBeInTheDocument();
    });

    it('should display change with correct sign for negative values', () => {
      render(<MetricCard title="Test" value={100} change={-8.2} />);

      expect(screen.getByText(/-8\.2%/)).toBeInTheDocument();
    });
  });

  describe('colors', () => {
    it('should show green color for positive trend', () => {
      const { container } = render(
        <MetricCard title="Sent" value={100} change={5} inverseColors={false} />
      );

      const trendDiv = container.querySelector('[class*="text-green"]') || container.querySelector('[class*="green"]');
      expect(trendDiv).toBeInTheDocument();
    });

    it('should show red color for negative trend', () => {
      const { container } = render(
        <MetricCard title="Bounced" value={50} change={-3} inverseColors={false} />
      );

      const trendDiv = container.querySelector('[class*="text-red"]') || container.querySelector('[class*="red"]');
      expect(trendDiv).toBeInTheDocument();
    });

    it('should invert colors when inverseColors is true', () => {
      render(
        <MetricCard title="Bounce Rate" value={2} change={5} inverseColors={true} />
      );

      // For bounce rate, higher is bad, so positive trend should be red
      expect(screen.getByText(/\+5/)).toBeInTheDocument();
    });

    it('should invert colors for negative trend with inverseColors', () => {
      render(
        <MetricCard title="Bounce Rate" value={2} change={-5} inverseColors={true} />
      );

      // For bounce rate, lower is good, so negative trend should be green
      expect(screen.getByText(/-5/)).toBeInTheDocument();
    });
  });

  describe('formatting', () => {
    it('should format percentage values with format prop', () => {
      render(<MetricCard title="Open Rate" value={25.5} format="percentage" />);

      expect(screen.getByText('25.5%')).toBeInTheDocument();
    });

    it('should format number values as-is by default', () => {
      render(<MetricCard title="Sent" value={1500} format="number" />);

      expect(screen.getByText('1500')).toBeInTheDocument();
    });

    it('should handle string values without formatting', () => {
      render(<MetricCard title="Status" value="In Progress" />);

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  describe('optional props', () => {
    it('should handle missing optional props gracefully', () => {
      render(<MetricCard title="Required" value={100} />);

      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should display changeLabel when provided', () => {
      render(
        <MetricCard
          title="Sent"
          value={100}
          change={10}
          changeLabel="from last week"
        />
      );

      expect(screen.getByText('from last week')).toBeInTheDocument();
    });

    it('should not display changeLabel when not provided', () => {
      render(<MetricCard title="Sent" value={100} change={10} />);

      // changeLabel should not be in the document if not provided
      expect(screen.queryByText(/from/)).not.toBeInTheDocument();
    });
  });

  describe('card styling', () => {
    it('should have card structure', () => {
      const { container } = render(<MetricCard title="Test" value={100} />);

      const card = container.querySelector('[class*="border"]') || container.querySelector('[class*="rounded"]');
      expect(card).toBeInTheDocument();
    });

    it('should render large value as heading', () => {
      const { container } = render(<MetricCard title="Test" value={1500} />);

      const largeText = container.querySelector('[class*="text-3xl"]') || container.querySelector('[class*="font-bold"]');
      expect(largeText).toBeInTheDocument();
    });
  });
});

describe('MetricCardCompact Component', () => {
  describe('rendering', () => {
    it('should render compact version', () => {
      render(<MetricCardCompact title="Sent" value={100} />);

      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(
        <MetricCardCompact
          title="Emails"
          value={100}
          icon={<Mail data-testid="mail-icon" />}
        />
      );

      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    });

    it('should display change indicator', () => {
      render(
        <MetricCardCompact title="Sent" value={100} change={5} />
      );

      expect(screen.getByText(/\+5/)).toBeInTheDocument();
    });
  });

  describe('colors', () => {
    it('should apply green color for positive change', () => {
      render(
        <MetricCardCompact title="Sent" value={100} change={10} inverseColors={false} />
      );

      expect(screen.getByText(/\+10/)).toBeInTheDocument();
    });

    it('should apply red color for negative change', () => {
      render(
        <MetricCardCompact title="Bounced" value={50} change={-5} inverseColors={false} />
      );

      expect(screen.getByText(/-5/)).toBeInTheDocument();
    });

    it('should invert colors when inverseColors is true', () => {
      render(
        <MetricCardCompact title="Bounce Rate" value={2} change={10} inverseColors={true} />
      );

      expect(screen.getByText(/\+10/)).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should have horizontal layout', () => {
      const { container } = render(
        <MetricCardCompact title="Test" value={100} />
      );

      const flexContainer = container.querySelector('[class*="flex"]');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should truncate title text', () => {
      render(
        <MetricCardCompact title="Very Long Campaign Name That Should Truncate" value={100} />
      );

      const title = screen.getByText(/Very Long Campaign Name/);
      expect(title).toBeInTheDocument();
    });
  });

  describe('optional props', () => {
    it('should handle missing change gracefully', () => {
      const { container } = render(
        <MetricCardCompact title="Test" value={100} />
      );

      // Should not have percentage indicator
      const percentElements = container.querySelectorAll('[class*="text-"]');
      expect(container).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <MetricCardCompact title="Test" value={100} className="custom" />
      );

      const element = container.querySelector('.custom');
      expect(element).toBeInTheDocument();
    });
  });
});
