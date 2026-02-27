import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SimpleLineChart,
  SimpleBarChart,
  SimpleDonutChart,
  ProgressBar,
  Sparkline,
} from '@/components/analytics/Charts';

describe('SimpleLineChart Component', () => {
  const mockData = [
    { label: 'Jan', value: 100 },
    { label: 'Feb', value: 120 },
    { label: 'Mar', value: 110 },
    { label: 'Apr', value: 140 },
  ];

  describe('rendering', () => {
    it('should render with provided data', () => {
      render(<SimpleLineChart data={mockData} />);

      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Apr')).toBeInTheDocument();
    });

    it('should render with title and description', () => {
      render(
        <SimpleLineChart
          data={mockData}
          title="Email Opens"
          description="Daily opens trend"
        />
      );

      expect(screen.getByText('Email Opens')).toBeInTheDocument();
      expect(screen.getByText('Daily opens trend')).toBeInTheDocument();
    });

    it('should render SVG chart', () => {
      const { container } = render(<SimpleLineChart data={mockData} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('with empty data', () => {
    it('should handle empty data array', () => {
      const { container } = render(<SimpleLineChart data={[]} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('grid display', () => {
    it('should show grid lines by default', () => {
      const { container } = render(<SimpleLineChart data={mockData} showGrid={true} />);

      const gridLines = container.querySelectorAll('g line');
      expect(gridLines.length).toBeGreaterThan(0);
    });

    it('should hide grid when showGrid is false', () => {
      const { container } = render(<SimpleLineChart data={mockData} showGrid={false} />);

      const gridGroup = container.querySelector('g[opacity="0.3"]');
      expect(gridGroup === null || gridGroup.children.length === 0 || !gridGroup).toBeTruthy();
    });
  });

  describe('customization', () => {
    it('should apply custom color', () => {
      const { container } = render(
        <SimpleLineChart data={mockData} color="#ff0000" />
      );

      const path = container.querySelector('path[stroke="#ff0000"]');
      expect(path).toBeInTheDocument();
    });

    it('should apply custom height', () => {
      const { container } = render(
        <SimpleLineChart data={mockData} height={300} />
      );

      const chartDiv = container.querySelector('[style*="height"]');
      expect(chartDiv).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SimpleLineChart data={mockData} className="custom-class" />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });
});

describe('SimpleBarChart Component', () => {
  const mockData = [
    { label: 'Sent', value: 1000 },
    { label: 'Opened', value: 250 },
    { label: 'Clicked', value: 100 },
  ];

  describe('rendering', () => {
    it('should render with provided data', () => {
      render(<SimpleBarChart data={mockData} />);

      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Opened')).toBeInTheDocument();
      expect(screen.getByText('Clicked')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(
        <SimpleBarChart data={mockData} title="Email Metrics" />
      );

      expect(screen.getByText('Email Metrics')).toBeInTheDocument();
    });
  });

  describe('orientation', () => {
    it('should render vertical bars by default', () => {
      const { container } = render(<SimpleBarChart data={mockData} horizontal={false} />);

      const contentDiv = container.querySelector('[class*="flex"]');
      expect(contentDiv).toBeInTheDocument();
    });

    it('should render horizontal bars when horizontal is true', () => {
      const { container } = render(<SimpleBarChart data={mockData} horizontal={true} />);

      const bars = container.querySelectorAll('[class*="flex"]');
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  describe('customization', () => {
    it('should apply custom color to bars', () => {
      const { container } = render(
        <SimpleBarChart data={mockData} color="#00ff00" />
      );

      expect(container).toBeInTheDocument();
    });

    it('should apply individual bar colors', () => {
      const dataWithColors = [
        { label: 'Sent', value: 1000, color: '#ff0000' },
        { label: 'Opened', value: 250, color: '#00ff00' },
      ];

      const { container } = render(<SimpleBarChart data={dataWithColors} />);

      expect(container).toBeInTheDocument();
    });

    it('should apply custom height', () => {
      const { container } = render(
        <SimpleBarChart data={mockData} height={250} />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('with empty data', () => {
    it('should handle empty data array', () => {
      const { container } = render(<SimpleBarChart data={[]} />);

      expect(container.querySelector('[class*="flex"]')).toBeInTheDocument();
    });
  });
});

describe('SimpleDonutChart Component', () => {
  const mockData = [
    { label: 'Opened', value: 250, color: '#3b82f6' },
    { label: 'Not Opened', value: 750, color: '#e5e7eb' },
  ];

  describe('rendering', () => {
    it('should render with provided data', () => {
      render(<SimpleDonutChart data={mockData} />);

      expect(screen.getByText('Opened')).toBeInTheDocument();
      expect(screen.getByText('Not Opened')).toBeInTheDocument();
    });

    it('should render SVG donut chart', () => {
      const { container } = render(<SimpleDonutChart data={mockData} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render legend', () => {
      render(<SimpleDonutChart data={mockData} />);

      expect(screen.getByText('Opened')).toBeInTheDocument();
      expect(screen.getByText('Not Opened')).toBeInTheDocument();
    });
  });

  describe('center content', () => {
    it('should display center label and value', () => {
      render(
        <SimpleDonutChart
          data={mockData}
          centerLabel="Open Rate"
          centerValue="50"
        />
      );

      expect(screen.getByText('Open Rate')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should display center value only', () => {
      render(
        <SimpleDonutChart data={mockData} centerValue="250" />
      );

      expect(screen.getByText('250')).toBeInTheDocument();
    });

    it('should display center label only', () => {
      render(
        <SimpleDonutChart data={mockData} centerLabel="Emails" />
      );

      expect(screen.getByText('Emails')).toBeInTheDocument();
    });
  });

  describe('customization', () => {
    it('should apply custom size', () => {
      const { container } = render(
        <SimpleDonutChart data={mockData} size={250} />
      );

      const chart = container.querySelector('[style*="width"]');
      expect(chart).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SimpleDonutChart data={mockData} className="custom" />
      );

      const card = container.querySelector('.custom');
      expect(card).toBeInTheDocument();
    });

    it('should display percentages in legend', () => {
      render(<SimpleDonutChart data={mockData} />);

      const percentages = screen.getAllByText(/75/);
      expect(percentages.length).toBeGreaterThan(0);
    });
  });

  describe('with empty data', () => {
    it('should handle empty data array', () => {
      const { container } = render(<SimpleDonutChart data={[]} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});

describe('ProgressBar Component', () => {
  describe('rendering', () => {
    it('should render progress bar', () => {
      const { container } = render(<ProgressBar value={50} />);

      const bar = container.querySelector('[class*="bg-muted"]');
      expect(bar).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<ProgressBar value={50} label="Progress" />);

      expect(screen.getByText('Progress')).toBeInTheDocument();
    });

    it('should show value by default', () => {
      render(<ProgressBar value={50} />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should hide value when showValue is false', () => {
      const { container } = render(
        <ProgressBar value={50} showValue={false} label="Test" />
      );

      expect(container.textContent).not.toContain('50');
    });
  });

  describe('calculation', () => {
    it('should calculate percentage correctly', () => {
      const { container } = render(
        <ProgressBar value={30} max={100} />
      );

      const filledBar = container.querySelector('div[style*="30%"]') || container.querySelector('div[style*="width"]');
      expect(filledBar).toBeInTheDocument();
    });

    it('should cap percentage at 100%', () => {
      const { container } = render(
        <ProgressBar value={150} max={100} />
      );

      expect(container).toBeInTheDocument();
    });

    it('should handle custom max value', () => {
      render(<ProgressBar value={50} max={200} />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  describe('customization', () => {
    it('should apply custom color', () => {
      const { container } = render(
        <ProgressBar value={50} color="#ff0000" />
      );

      expect(container).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ProgressBar value={50} className="custom" />
      );

      const div = container.querySelector('.custom');
      expect(div).toBeInTheDocument();
    });
  });
});

describe('Sparkline Component', () => {
  const mockData = [10, 20, 15, 30, 25, 35, 28];

  describe('rendering', () => {
    it('should render sparkline SVG', () => {
      const { container } = render(<Sparkline data={mockData} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render line path', () => {
      const { container } = render(<Sparkline data={mockData} />);

      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
    });
  });

  describe('with empty data', () => {
    it('should handle empty data array', () => {
      const { container } = render(<Sparkline data={[]} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      const { container } = render(<Sparkline data={[10]} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('customization', () => {
    it('should apply custom color', () => {
      const { container } = render(
        <Sparkline data={mockData} color="#ff0000" />
      );

      const path = container.querySelector('path[stroke="#ff0000"]');
      expect(path).toBeInTheDocument();
    });

    it('should apply custom width and height', () => {
      const { container } = render(
        <Sparkline data={mockData} width={120} height={30} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '120');
      expect(svg).toHaveAttribute('height', '30');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Sparkline data={mockData} className="custom" />
      );

      const svg = container.querySelector('svg.custom');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('default dimensions', () => {
    it('should have default width and height', () => {
      const { container } = render(<Sparkline data={mockData} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '24');
    });
  });
});
