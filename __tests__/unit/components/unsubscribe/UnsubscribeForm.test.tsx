import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnsubscribeForm } from '@/components/unsubscribe/UnsubscribeForm';

vi.mock('@/stores/unsubscribe-store', () => ({
  useUnsubscribeStore: () => ({
    addToSuppression: vi.fn(),
    isEmailSuppressed: vi.fn(() => false),
    error: null,
    clearError: vi.fn(),
    isLoading: false,
    searchQuery: '',
    reasonFilter: 'all',
    sourceFilter: 'all',
    dateRange: '7d',
    selectedIds: [],
    currentPage: 1,
    pageSize: 25,
    loadSuppressionList: vi.fn(),
    setSearchQuery: vi.fn(),
    setReasonFilter: vi.fn(),
    setSourceFilter: vi.fn(),
    setDateRange: vi.fn(),
    clearFilters: vi.fn(),
    toggleSelection: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    removeFromSuppression: vi.fn(),
    bulkRemove: vi.fn(),
    exportSuppression: vi.fn(),
    getFilteredList: vi.fn(() => []),
    getPaginatedList: vi.fn(() => []),
    stats: {
      totalSuppressed: 0,
      last7Days: 0,
      last30Days: 0,
      trend: 0,
      byReason: { not_interested: 0, too_frequent: 0, never_subscribed: 0, inappropriate_content: 0, other: 0 },
      bySource: { link: 0, manual: 0, import: 0, bounce: 0, complaint: 0 },
    },
  }),
}));

describe('UnsubscribeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders confirm step initially', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    expect(screen.getByText('unsubscribe.confirmTitle')).toBeInTheDocument();
  });

  it('displays email address on confirm step', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays campaign name on confirm step', () => {
    render(<UnsubscribeForm email="test@example.com" campaignName="Summer Sale" />);
    expect(screen.getByText(/unsubscribe.fromCampaign/)).toBeInTheDocument();
  });

  it('renders confirm button', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    expect(screen.getByText('unsubscribe.confirmButton')).toBeInTheDocument();
  });

  it('transitions to feedback step when confirm button clicked', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    expect(screen.getByText('unsubscribe.feedbackTitle')).toBeInTheDocument();
  });

  it('displays reason options on feedback step', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    expect(screen.getByText('unsubscribe.reasons.notInterested')).toBeInTheDocument();
    expect(screen.getByText('unsubscribe.reasons.tooFrequent')).toBeInTheDocument();
    expect(screen.getByText('unsubscribe.reasons.neverSubscribed')).toBeInTheDocument();
  });

  it('renders reason radio buttons', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThan(0);
  });

  it('displays feedback textarea on feedback step', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    expect(screen.getByPlaceholderText('unsubscribe.feedbackPlaceholder')).toBeInTheDocument();
  });

  it('displays skip and submit buttons on feedback step', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    expect(screen.getByText('unsubscribe.skip')).toBeInTheDocument();
    expect(screen.getByText('unsubscribe.submit')).toBeInTheDocument();
  });

  it('transitions to success step when submit clicked', async () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    const submitBtn = screen.getByText('unsubscribe.submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('unsubscribe.successTitle')).toBeInTheDocument();
    });
  });

  it('displays success message', async () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    const submitBtn = screen.getByText('unsubscribe.submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('unsubscribe.successMessage')).toBeInTheDocument();
    });
  });

  it('shows resubscribe hint on success step', async () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    const submitBtn = screen.getByText('unsubscribe.submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('unsubscribe.resubscribeHint')).toBeInTheDocument();
    });
  });

  it('shows already unsubscribed state when email is suppressed', () => {
    const mockIsEmailSuppressed = vi.fn(() => true);
    vi.mocked(require('@/stores/unsubscribe-store').useUnsubscribeStore).mockReturnValueOnce({
      addToSuppression: vi.fn(),
      isEmailSuppressed: mockIsEmailSuppressed,
      error: null,
      clearError: vi.fn(),
      isLoading: false,
      searchQuery: '',
      reasonFilter: 'all',
      sourceFilter: 'all',
      dateRange: '7d',
      selectedIds: [],
      currentPage: 1,
      pageSize: 25,
      loadSuppressionList: vi.fn(),
      setSearchQuery: vi.fn(),
      setReasonFilter: vi.fn(),
      setSourceFilter: vi.fn(),
      setDateRange: vi.fn(),
      clearFilters: vi.fn(),
      toggleSelection: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      removeFromSuppression: vi.fn(),
      bulkRemove: vi.fn(),
      exportSuppression: vi.fn(),
      getFilteredList: vi.fn(() => []),
      getPaginatedList: vi.fn(() => []),
      stats: {
        totalSuppressed: 0,
        last7Days: 0,
        last30Days: 0,
        trend: 0,
        byReason: { not_interested: 0, too_frequent: 0, never_subscribed: 0, inappropriate_content: 0, other: 0 },
        bySource: { link: 0, manual: 0, import: 0, bounce: 0, complaint: 0 },
      },
    });

    render(<UnsubscribeForm email="test@example.com" />);
    expect(screen.getByText('unsubscribe.alreadyUnsubscribed')).toBeInTheDocument();
  });

  it('can select different reason options', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);

    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);
    expect((radios[1] as HTMLInputElement).checked).toBe(true);
  });

  it('shows submitting state when form is submitted', () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    const submitBtn = screen.getByText('unsubscribe.submit');
    fireEvent.click(submitBtn);

    expect(screen.getByText('unsubscribe.submitting')).toBeInTheDocument();
  });

  it('calls onComplete callback when submission succeeds', async () => {
    const mockOnComplete = vi.fn();
    render(<UnsubscribeForm email="test@example.com" onComplete={mockOnComplete} />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    const submitBtn = screen.getByText('unsubscribe.submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('accepts className prop', () => {
    const { container } = render(<UnsubscribeForm email="test@example.com" className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('can skip feedback and submit directly', async () => {
    render(<UnsubscribeForm email="test@example.com" />);
    const confirmBtn = screen.getByText('unsubscribe.confirmButton');
    fireEvent.click(confirmBtn);
    const skipBtn = screen.getByText('unsubscribe.skip');
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByText('unsubscribe.successTitle')).toBeInTheDocument();
    });
  });
});
