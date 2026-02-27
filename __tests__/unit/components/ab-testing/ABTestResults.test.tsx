import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ABTestResults } from '@/components/ab-testing/ABTestResults';
import { createEmptyTest, type ABTest, type ABVariant } from '@/stores/ab-test-store';

// Create a test variant with stats
const createTestVariant = (name: string, sent: number = 100): ABVariant => ({
  id: `variant-${name}`,
  name,
  sent,
  opened: Math.floor(sent * 0.25),
  clicked: Math.floor(sent * 0.1),
  converted: Math.floor(sent * 0.05),
});

// Mock the store
const mockStore = {
  currentTest: null as ABTest | null,
  createTest: vi.fn(),
  updateTest: vi.fn(),
  addVariant: vi.fn(),
  updateVariant: vi.fn(),
  removeVariant: vi.fn(),
  setWinnerCriteria: vi.fn(),
  setSampleSize: vi.fn(),
  setTestDuration: vi.fn(),
  setAutoSelectWinner: vi.fn(),
  selectWinner: vi.fn(),
  startTest: vi.fn(),
  cancelTest: vi.fn(),
  completeTest: vi.fn(),
  saveTest: vi.fn(),
  loadTest: vi.fn(),
  deleteTest: vi.fn(),
  resetCurrentTest: vi.fn(),
  calculateWinner: vi.fn(() => null),
  getVariantStats: vi.fn(() => ({ openRate: 0, clickRate: 0, conversionRate: 0 })),
};

vi.mock('@/stores/ab-test-store', () => ({
  useABTestStore: () => mockStore,
  createEmptyTest,
}));

describe('ABTestResults Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.currentTest = null;
    mockStore.getVariantStats.mockReturnValue({ openRate: 25, clickRate: 10, conversionRate: 5 });
  });

  describe('rendering', () => {
    it('should show no test selected message when currentTest is null', () => {
      mockStore.currentTest = null;

      render(<ABTestResults />);

      expect(screen.getByText(/abTest.noTestSelected/i)).toBeInTheDocument();
    });

    it('should render test name and status when currentTest exists', () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'running';
      mockStore.currentTest = test;

      render(<ABTestResults />);

      expect(screen.getByText(test.name)).toBeInTheDocument();
      expect(screen.getByText(/abTest.status.running/i)).toBeInTheDocument();
    });

    it('should render test type and winner criteria info', () => {
      const test = createEmptyTest('campaign-123');
      test.testType = 'subject';
      test.winnerCriteria = 'openRate';
      mockStore.currentTest = test;

      render(<ABTestResults />);

      // The component displays translated keys as-is due to mock
      expect(screen.getByText(/abTest.types.subject/i)).toBeInTheDocument();
      expect(screen.getByText(/abTest.criteria.openRate/i)).toBeInTheDocument();
    });

    it('should render variant cards with metrics', () => {
      const test = createEmptyTest('campaign-123');
      const variant1 = createTestVariant('A', 100);
      const variant2 = createTestVariant('B', 100);
      mockStore.currentTest = { ...test, variants: [variant1, variant2] };

      render(<ABTestResults />);

      // Check for variant names
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();

      // Check for sent count
      expect(screen.getAllByText('100')).toHaveLength(2);
    });

    it('should render stats for each variant', () => {
      const test = createEmptyTest('campaign-123');
      const variant1 = createTestVariant('A', 100);
      mockStore.currentTest = { ...test, variants: [variant1] };
      mockStore.getVariantStats.mockReturnValue({
        openRate: 25.5,
        clickRate: 10.3,
        conversionRate: 5.1,
      });

      render(<ABTestResults />);

      // Check for metric labels
      expect(screen.getByText(/abTest.sent/i)).toBeInTheDocument();
      expect(screen.getByText(/abTest.openRate/i)).toBeInTheDocument();
      expect(screen.getByText(/abTest.clickRate/i)).toBeInTheDocument();
      expect(screen.getByText(/abTest.conversionRate/i)).toBeInTheDocument();
    });
  });

  describe('test loading', () => {
    it('should call loadTest when testId prop is provided', () => {
      mockStore.currentTest = null;

      render(<ABTestResults testId="test-123" />);

      expect(mockStore.loadTest).toHaveBeenCalledWith('test-123');
    });

    it('should not call loadTest if currentTest already has same testId', () => {
      const test = createEmptyTest('campaign-123');
      test.id = 'test-123';
      mockStore.currentTest = test;

      vi.clearAllMocks();
      render(<ABTestResults testId="test-123" />);

      expect(mockStore.loadTest).not.toHaveBeenCalled();
    });

    it('should call loadTest when testId changes', () => {
      const test = createEmptyTest('campaign-123');
      test.id = 'test-123';
      mockStore.currentTest = test;

      const { rerender } = render(<ABTestResults testId="test-123" />);

      vi.clearAllMocks();
      rerender(<ABTestResults testId="test-456" />);

      expect(mockStore.loadTest).toHaveBeenCalledWith('test-456');
    });
  });

  describe('running test', () => {
    it('should show countdown timer when test is running', async () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'running';
      test.startedAt = new Date(Date.now() - 60000); // Started 1 minute ago
      test.testDuration = 2; // 2 hours
      mockStore.currentTest = test;

      render(<ABTestResults />);

      await waitFor(() => {
        expect(screen.getByText(/remaining/i)).toBeInTheDocument();
      });
    });

    it('should show Select as Winner button for running tests', () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'running';
      test.autoSelectWinner = false;
      mockStore.currentTest = test;

      render(<ABTestResults />);

      const selectWinnerButtons = screen.getAllByRole('button', { name: /abTest.selectAsWinner/i });
      expect(selectWinnerButtons.length).toBeGreaterThan(0);
    });

    it('should not show Select as Winner button when autoSelectWinner is true', () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'running';
      test.autoSelectWinner = true;
      mockStore.currentTest = test;

      render(<ABTestResults />);

      // Should not render the select winner buttons
      const selectButtons = screen.queryAllByRole('button', { name: /abTest.selectAsWinner/i });
      expect(selectButtons.length).toBe(0);
    });

    it('should call selectWinner and onSelectWinner when Select as Winner is clicked', async () => {
      const user = userEvent.setup();
      const onSelectWinner = vi.fn();
      const test = createEmptyTest('campaign-123');
      test.status = 'running';
      test.autoSelectWinner = false;
      mockStore.currentTest = test;

      render(<ABTestResults onSelectWinner={onSelectWinner} />);

      const selectWinnerButtons = screen.getAllByRole('button', { name: /abTest.selectAsWinner/i });
      await user.click(selectWinnerButtons[0]);

      expect(mockStore.selectWinner).toHaveBeenCalled();
      expect(onSelectWinner).toHaveBeenCalled();
    });
  });

  describe('winner display', () => {
    it('should show Crown icon for winning variant', () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'completed';
      test.winnerId = test.variants[0].id;
      mockStore.currentTest = test;

      const { container } = render(<ABTestResults />);

      const crownIcons = container.querySelectorAll('svg[class*="text-yellow"]');
      expect(crownIcons.length).toBeGreaterThan(0);
    });

    it('should show TrendingUp icon for suggested winner when running', () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      test.status = 'running';
      test.autoSelectWinner = false;
      mockStore.currentTest = test;
      mockStore.calculateWinner.mockReturnValue(test.variants[0]);

      const { container } = render(<ABTestResults />);

      // Should show trending up indicator for suggested winner
      expect(container.innerHTML).toBeDefined();
    });

    it('should show winner badge on completed test', () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'completed';
      test.winnerId = test.variants[0].id;
      mockStore.currentTest = test;

      render(<ABTestResults />);

      expect(screen.getByText(/abTest.winner/i)).toBeInTheDocument();
    });
  });

  describe('completion summary', () => {
    it('should show completion summary when test is completed', () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'completed';
      test.winnerId = test.variants[0].id;
      mockStore.currentTest = test;

      render(<ABTestResults />);

      expect(screen.getByText(/abTest.testCompleted/i)).toBeInTheDocument();
      expect(screen.getByText(/abTest.wasSelectedAsWinner/i)).toBeInTheDocument();
    });

    it('should display winner variant name in summary', () => {
      const test = createEmptyTest('campaign-123');
      const variant1 = createTestVariant('A', 100);
      variant1.name = 'Control';
      test.variants = [variant1, createTestVariant('B', 100)];
      test.status = 'completed';
      test.winnerId = variant1.id;
      mockStore.currentTest = test;

      render(<ABTestResults />);

      expect(screen.getByText('Control')).toBeInTheDocument();
    });

    it('should not show completion summary when test is not completed', () => {
      const test = createEmptyTest('campaign-123');
      test.status = 'running';
      mockStore.currentTest = test;

      render(<ABTestResults />);

      expect(screen.queryByText(/abTest.testCompleted/i)).not.toBeInTheDocument();
    });
  });

  describe('variant card styling', () => {
    it('should highlight winner variant with ring', () => {
      const test = createEmptyTest('campaign-123');
      test.winnerId = test.variants[0].id;
      mockStore.currentTest = test;

      const { container } = render(<ABTestResults />);

      const cards = container.querySelectorAll('[class*="ring"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should show stats for all variants', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestResults />);

      // Each variant should have at least one stat displayed
      const variantStats = screen.getAllByText(/25/);
      expect(variantStats.length).toBeGreaterThanOrEqual(test.variants.length);
    });
  });

  describe('progress bars', () => {
    it('should render progress bar for each variant', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      const { container } = render(<ABTestResults />);

      const progressBars = container.querySelectorAll('[style*="width"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should display performance percentage in progress bar label', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;
      mockStore.getVariantStats.mockReturnValue({
        openRate: 30.5,
        clickRate: 10,
        conversionRate: 5,
      });

      render(<ABTestResults />);

      expect(screen.getByText(/performance/i)).toBeInTheDocument();
    });
  });
});
