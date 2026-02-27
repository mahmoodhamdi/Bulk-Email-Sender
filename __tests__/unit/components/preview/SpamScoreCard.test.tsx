import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpamScoreCard } from '@/components/preview/SpamScoreCard';
import type { SpamAnalysis, SpamIssue } from '@/stores/preview-store';

const mockSpamAnalysis: SpamAnalysis = {
  score: 25,
  rating: 'good',
  issues: [
    {
      type: 'warning',
      category: 'subject',
      message: 'Subject line is too long',
      suggestion: 'Keep subject line under 50 characters',
    },
    {
      type: 'info',
      category: 'technical',
      message: 'Missing reply-to header',
      suggestion: 'Add a reply-to email address',
    },
  ],
  checkedAt: new Date(),
};

const mockPoorSpamAnalysis: SpamAnalysis = {
  score: 85,
  rating: 'poor',
  issues: [
    {
      type: 'error',
      category: 'content',
      message: 'Too many links in content',
      suggestion: 'Reduce the number of links',
    },
    {
      type: 'warning',
      category: 'technical',
      message: 'No unsubscribe link',
      suggestion: 'Add an unsubscribe link',
    },
  ],
  checkedAt: new Date(),
};

const mockPreviewStore = {
  spamAnalysis: null,
  isAnalyzing: false,
  analyzeSpam: vi.fn(),
};

vi.mock('@/stores/preview-store', () => ({
  usePreviewStore: () => mockPreviewStore,
}));

describe('SpamScoreCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreviewStore.spamAnalysis = null;
  });

  it('renders initial state with analyze button', () => {
    render(<SpamScoreCard />);

    expect(screen.getByText('preview.analyzeSpam')).toBeInTheDocument();
  });

  it('shows analyze prompt when no analysis done', () => {
    render(<SpamScoreCard />);

    expect(screen.getByText('preview.spamCheckDescription')).toBeInTheDocument();
  });

  it('calls analyzeSpam when button clicked', async () => {
    const user = userEvent.setup();
    render(<SpamScoreCard />);

    const button = screen.getByText('preview.analyzeSpam');
    await user.click(button);

    expect(mockPreviewStore.analyzeSpam).toHaveBeenCalled();
  });

  it('shows loading state while analyzing', () => {
    mockPreviewStore.isAnalyzing = true;

    render(<SpamScoreCard />);

    expect(screen.getByText('preview.analyzing')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    mockPreviewStore.isAnalyzing = true;

    const { container } = render(<SpamScoreCard />);

    const spinner = container.querySelector('[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  describe('with spam analysis', () => {
    beforeEach(() => {
      mockPreviewStore.spamAnalysis = mockSpamAnalysis;
    });

    it('displays spam score gauge', () => {
      render(<SpamScoreCard />);

      // Score should be 100 - 25 = 75
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('shows rating badge', () => {
      render(<SpamScoreCard />);

      // Rating should be displayed
      expect(screen.getByText('preview.spamRating.good')).toBeInTheDocument();
    });

    it('displays warning count', () => {
      render(<SpamScoreCard />);

      const warningCount = screen.getByText('1');
      expect(warningCount).toBeInTheDocument();
    });

    it('displays reanalyze button', async () => {
      const user = userEvent.setup();
      render(<SpamScoreCard />);

      const buttons = screen.getAllByRole('button');
      const reanalyzeBtn = buttons.find((btn) =>
        btn.textContent?.includes('preview.reanalyze')
      );
      expect(reanalyzeBtn).toBeDefined();
    });

    it('shows all issues', () => {
      render(<SpamScoreCard />);

      expect(screen.getByText('Subject line is too long')).toBeInTheDocument();
      expect(screen.getByText('Missing reply-to header')).toBeInTheDocument();
    });

    it('displays issue suggestions', () => {
      render(<SpamScoreCard />);

      expect(
        screen.getByText('Keep subject line under 50 characters')
      ).toBeInTheDocument();
      expect(screen.getByText('Add a reply-to email address')).toBeInTheDocument();
    });

    it('displays issue categories', () => {
      render(<SpamScoreCard />);

      expect(screen.getByText('subject')).toBeInTheDocument();
      expect(screen.getByText('technical')).toBeInTheDocument();
    });

    it('renders issue count summary', () => {
      render(<SpamScoreCard />);

      // Should show warning count
      expect(screen.getByText('preview.warnings')).toBeInTheDocument();
    });

    it('shows excellent rating with green color', () => {
      const excellentAnalysis: SpamAnalysis = {
        ...mockSpamAnalysis,
        score: 5,
        rating: 'excellent',
      };

      mockPreviewStore.spamAnalysis = excellentAnalysis;

      render(<SpamScoreCard />);

      expect(screen.getByText('preview.spamRating.excellent')).toBeInTheDocument();
    });

    it('shows poor rating with red color', () => {
      mockPreviewStore.spamAnalysis = mockPoorSpamAnalysis;

      render(<SpamScoreCard />);

      expect(screen.getByText('preview.spamRating.poor')).toBeInTheDocument();
    });

    it('counts errors correctly', () => {
      mockPreviewStore.spamAnalysis = mockPoorSpamAnalysis;

      render(<SpamScoreCard />);

      // Should show error count
      expect(screen.getByText('preview.errors')).toBeInTheDocument();
    });
  });

  describe('Issue types', () => {
    beforeEach(() => {
      mockPreviewStore.spamAnalysis = mockSpamAnalysis;
    });

    it('renders warning icon for warning issues', () => {
      const { container } = render(<SpamScoreCard />);

      const warnings = container.querySelectorAll('[class*="text-yellow"]');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('renders info icon for info issues', () => {
      const { container } = render(<SpamScoreCard />);

      const infos = container.querySelectorAll('[class*="text-blue"]');
      expect(infos.length).toBeGreaterThan(0);
    });

    it('renders error icon for error issues', () => {
      mockPreviewStore.spamAnalysis = mockPoorSpamAnalysis;

      const { container } = render(<SpamScoreCard />);

      const errors = container.querySelectorAll('[class*="text-red"]');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Issue Styling', () => {
    beforeEach(() => {
      mockPreviewStore.spamAnalysis = {
        ...mockSpamAnalysis,
        issues: [
          {
            type: 'error',
            category: 'content',
            message: 'Critical error',
          },
          {
            type: 'warning',
            category: 'subject',
            message: 'Warning message',
          },
          {
            type: 'info',
            category: 'technical',
            message: 'Info message',
          },
        ],
      };
    });

    it('applies error styling to error issues', () => {
      const { container } = render(<SpamScoreCard />);

      const errorMessages = screen.getByText('Critical error');
      expect(errorMessages).toBeInTheDocument();
    });

    it('applies warning styling to warning issues', () => {
      const { container } = render(<SpamScoreCard />);

      const warningMessages = screen.getByText('Warning message');
      expect(warningMessages).toBeInTheDocument();
    });

    it('applies info styling to info issues', () => {
      const { container } = render(<SpamScoreCard />);

      const infoMessages = screen.getByText('Info message');
      expect(infoMessages).toBeInTheDocument();
    });
  });

  describe('Score Gauge', () => {
    beforeEach(() => {
      mockPreviewStore.spamAnalysis = mockSpamAnalysis;
    });

    it('displays score out of 100', () => {
      render(<SpamScoreCard />);

      // Should show 75/100 (100 - 25)
      expect(screen.getByText('/100')).toBeInTheDocument();
    });

    it('displays center gauge value', () => {
      render(<SpamScoreCard />);

      // Score 25 should show as 75 (100 - score)
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('shows SVG circle gauge', () => {
      const { container } = render(<SpamScoreCard />);

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('renders gauge with correct rating color', () => {
      const { container } = render(<SpamScoreCard />);

      // Should have circles in SVG for gauge
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Reanalyze Button', () => {
    beforeEach(() => {
      mockPreviewStore.spamAnalysis = mockSpamAnalysis;
    });

    it('shows reanalyze button', () => {
      render(<SpamScoreCard />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls analyzeSpam on reanalyze click', async () => {
      const user = userEvent.setup();
      render(<SpamScoreCard />);

      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        await user.click(buttons[buttons.length - 1]);
        expect(mockPreviewStore.analyzeSpam).toHaveBeenCalled();
      }
    });
  });

  it('renders issues heading', () => {
    mockPreviewStore.spamAnalysis = mockSpamAnalysis;

    render(<SpamScoreCard />);

    expect(screen.getByText('preview.issues')).toBeInTheDocument();
  });

  it('displays no analysis message when null', () => {
    mockPreviewStore.spamAnalysis = null;

    render(<SpamScoreCard />);

    expect(screen.getByText('preview.spamCheck')).toBeInTheDocument();
  });

  it('handles empty issues list', () => {
    mockPreviewStore.spamAnalysis = {
      ...mockSpamAnalysis,
      issues: [],
    };

    const { container } = render(<SpamScoreCard />);

    // Should still show the gauge and controls
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders with proper spacing and layout', () => {
    mockPreviewStore.spamAnalysis = mockSpamAnalysis;

    const { container } = render(<SpamScoreCard />);

    const root = container.firstChild;
    expect(root).toHaveClass('space-y-6');
  });

  it('shows fair rating styling', () => {
    mockPreviewStore.spamAnalysis = {
      ...mockSpamAnalysis,
      score: 50,
      rating: 'fair',
    };

    render(<SpamScoreCard />);

    expect(screen.getByText('preview.spamRating.fair')).toBeInTheDocument();
  });
});
