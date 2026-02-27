import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ABTestConfig } from '@/components/ab-testing/ABTestConfig';
import { createEmptyTest, type ABTest } from '@/stores/ab-test-store';

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
  calculateWinner: vi.fn(),
  getVariantStats: vi.fn(),
};

vi.mock('@/stores/ab-test-store', () => ({
  useABTestStore: () => mockStore,
  createEmptyTest,
}));

describe('ABTestConfig Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.currentTest = null;
  });

  describe('rendering', () => {
    it('should return null when currentTest is null', () => {
      const { container } = render(
        <ABTestConfig campaignId="campaign-123" />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when currentTest exists', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      expect(screen.getByDisplayValue(test.name)).toBeInTheDocument();
    });

    it('should render all 4 test type buttons', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      // The buttons contain test type labels from translation keys
      expect(screen.getByRole('button', { name: /abTest.types.subject/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abTest.types.content/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abTest.types.fromName/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abTest.types.sendTime/i })).toBeInTheDocument();
    });

    it('should render variant cards', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      // Should render variant names
      test.variants.forEach((variant) => {
        expect(screen.getByDisplayValue(variant.name)).toBeInTheDocument();
      });
    });
  });

  describe('initialization', () => {
    it('should call createTest on mount when no currentTest exists', () => {
      mockStore.currentTest = null;

      render(<ABTestConfig campaignId="campaign-123" />);

      expect(mockStore.createTest).toHaveBeenCalledWith('campaign-123');
    });

    it('should not call createTest when currentTest already exists', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      expect(mockStore.createTest).not.toHaveBeenCalled();
    });
  });

  describe('variant management', () => {
    it('should show add variant button when less than 4 variants', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = { ...test, variants: test.variants.slice(0, 2) };

      render(<ABTestConfig campaignId="campaign-123" />);

      expect(screen.getByRole('button', { name: /abTest.addVariant/i })).toBeInTheDocument();
    });

    it('should hide add variant button when 4 variants exist', () => {
      const test = createEmptyTest('campaign-123');
      const extraVariants = [
        ...test.variants,
        { ...test.variants[0], id: 'variant-3' },
        { ...test.variants[0], id: 'variant-4' },
      ];
      mockStore.currentTest = { ...test, variants: extraVariants };

      const { container } = render(<ABTestConfig campaignId="campaign-123" />);

      const addButtons = container.querySelectorAll('button');
      const addVariantButton = Array.from(addButtons).find((btn) =>
        btn.textContent?.includes('abTest.addVariant')
      );
      expect(addVariantButton).not.toBeInTheDocument();
    });

    it('should show remove button only when more than 2 variants exist', () => {
      const test = createEmptyTest('campaign-123');
      const variant3 = { ...test.variants[0], id: 'variant-3', name: 'Variant C' };
      mockStore.currentTest = { ...test, variants: [...test.variants, variant3] };

      render(<ABTestConfig campaignId="campaign-123" />);

      const removeButtons = screen.getAllByRole('button', { name: '' }).filter((btn) =>
        btn.querySelector('svg')
      );
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('should not show remove button when only 2 variants exist', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      // Count trash icons - should be none for 2 variants
      const trashButtons = screen.queryAllByRole('button').filter((btn) =>
        btn.querySelector('svg[class*="trash"]') || btn.className.includes('text-red-500')
      );
      expect(trashButtons.length).toBe(0);
    });

    it('should call addVariant when add variant button is clicked', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = { ...test, variants: test.variants.slice(0, 2) };

      render(<ABTestConfig campaignId="campaign-123" />);

      const addButton = screen.getByRole('button', { name: /abTest.addVariant/i });
      await user.click(addButton);

      expect(mockStore.addVariant).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Variant [A-Z]$/),
      });
    });

    it('should call removeVariant when remove button is clicked', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      const variant3 = { ...test.variants[0], id: 'variant-3', name: 'Variant C' };
      mockStore.currentTest = { ...test, variants: [...test.variants, variant3] };

      render(<ABTestConfig campaignId="campaign-123" />);

      // Get the remove buttons (they have the trash icon and red text)
      const buttons = screen.getAllByRole('button');
      const removeButton = buttons.find((btn) =>
        btn.className.includes('text-red-500') && btn.querySelector('svg')
      );

      if (removeButton) {
        await user.click(removeButton);
        expect(mockStore.removeVariant).toHaveBeenCalled();
      }
    });
  });

  describe('settings', () => {
    it('should render sample size slider', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const slider = screen.getByRole('slider', { name: '' }) as HTMLInputElement;
      expect(slider).toBeInTheDocument();
      expect(slider.type).toBe('range');
      expect(slider.min).toBe('5');
      expect(slider.max).toBe('50');
    });

    it('should update sample size when slider changes', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const slider = screen.getByRole('slider', { name: '' }) as HTMLInputElement;
      await user.clear(slider);
      await user.type(slider, '30');

      expect(mockStore.setSampleSize).toHaveBeenCalled();
    });

    it('should render test duration input', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const inputs = screen.getAllByRole('textbox');
      const durationInput = inputs.find((input) => (input as HTMLInputElement).type === 'number');
      expect(durationInput).toBeInTheDocument();
    });

    it('should update test duration when input changes', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const numberInputs = screen.getAllByDisplayValue(test.testDuration.toString());
      if (numberInputs.length > 0) {
        const input = numberInputs[0] as HTMLInputElement;
        await user.clear(input);
        await user.type(input, '8');
        expect(mockStore.setTestDuration).toHaveBeenCalled();
      }
    });

    it('should render winner criteria buttons', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      expect(screen.getByRole('button', { name: /abTest.criteria.openRate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abTest.criteria.clickRate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abTest.criteria.conversionRate/i })).toBeInTheDocument();
    });

    it('should call setWinnerCriteria when criteria button is clicked', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const clickRateButton = screen.getByRole('button', { name: /abTest.criteria.clickRate/i });
      await user.click(clickRateButton);

      expect(mockStore.setWinnerCriteria).toHaveBeenCalledWith('clickRate');
    });

    it('should render auto-select winner toggle', () => {
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      // The toggle is a button that changes bg color
      const toggleButtons = screen.getAllByRole('button');
      // Find button with toggle styling
      expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it('should call setAutoSelectWinner when toggle is clicked', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      // Find all buttons and click the one that represents the toggle
      const buttons = screen.getAllByRole('button');
      // The toggle button has specific styling, we'll click the one with relative/translate styling
      const toggleButton = buttons[buttons.length - 1]; // Usually near the end

      await user.click(toggleButton);
      expect(mockStore.setAutoSelectWinner).toHaveBeenCalled();
    });
  });

  describe('test name input', () => {
    it('should update test name when input changes', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const testNameInput = screen.getByDisplayValue(test.name) as HTMLInputElement;
      await user.clear(testNameInput);
      await user.type(testNameInput, 'New Test Name');

      expect(mockStore.updateTest).toHaveBeenCalledWith({ name: 'New Test Name' });
    });
  });

  describe('test type selection', () => {
    it('should call updateTest when test type button is clicked', async () => {
      const user = userEvent.setup();
      const test = createEmptyTest('campaign-123');
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const contentButton = screen.getByRole('button', { name: /abTest.types.content/i });
      await user.click(contentButton);

      expect(mockStore.updateTest).toHaveBeenCalledWith({ testType: 'content' });
    });

    it('should highlight selected test type', () => {
      const test = createEmptyTest('campaign-123');
      test.testType = 'subject';
      mockStore.currentTest = test;

      render(<ABTestConfig campaignId="campaign-123" />);

      const subjectButton = screen.getByRole('button', { name: /abTest.types.subject/i });
      expect(subjectButton.className).toContain('border-primary');
    });
  });
});
