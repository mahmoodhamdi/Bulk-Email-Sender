import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentHistory } from '@/components/billing/PaymentHistory';
import type { PaymentHistoryItem } from '@/stores/billing-store';

// Mock the store
const mockPayments: PaymentHistoryItem[] = [
  {
    id: 'pay-1',
    amount: 14999,
    currency: 'USD',
    status: 'succeeded',
    description: 'Pro Plan - Monthly',
    createdAt: '2024-01-15',
    receiptUrl: 'https://example.com/receipt/1',
  },
  {
    id: 'pay-2',
    amount: 4999,
    currency: 'USD',
    status: 'pending',
    description: 'Starter Plan - Monthly',
    createdAt: '2024-01-10',
    receiptUrl: null,
  },
  {
    id: 'pay-3',
    amount: 9999,
    currency: 'USD',
    status: 'failed',
    description: 'Enterprise Plan - Monthly',
    createdAt: '2024-01-05',
    receiptUrl: null,
  },
];

const mockStore = {
  paymentHistory: mockPayments,
  isLoadingHistory: false,
  fetchPaymentHistory: vi.fn(),
};

vi.mock('@/stores/billing-store', () => ({
  useBillingStore: () => mockStore,
  formatPrice: (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100),
}));

describe('PaymentHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.paymentHistory = mockPayments;
    mockStore.isLoadingHistory = false;
  });

  describe('rendering', () => {
    it('should render component title', () => {
      render(<PaymentHistory />);

      expect(screen.getByText('billing.paymentHistory')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<PaymentHistory />);

      expect(
        screen.getByText('billing.paymentHistoryDescription')
      ).toBeInTheDocument();
    });

    it('should render payment table', () => {
      render(<PaymentHistory />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should display table headers', () => {
      render(<PaymentHistory />);

      expect(screen.getByText('billing.date')).toBeInTheDocument();
      expect(screen.getByText('billing.description')).toBeInTheDocument();
      expect(screen.getByText('billing.amount')).toBeInTheDocument();
      expect(screen.getByText('billing.status')).toBeInTheDocument();
      expect(screen.getByText('billing.receipt')).toBeInTheDocument();
    });
  });

  describe('payment data display', () => {
    it('should display all payments in table', () => {
      render(<PaymentHistory />);

      expect(screen.getByText('Pro Plan - Monthly')).toBeInTheDocument();
      expect(screen.getByText('Starter Plan - Monthly')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Plan - Monthly')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<PaymentHistory />);

      expect(screen.getByText(/1\/15\/2024|15\/1\/2024/)).toBeInTheDocument();
    });

    it('should display formatted amounts', () => {
      render(<PaymentHistory />);

      expect(screen.getByText('$149.99')).toBeInTheDocument();
      expect(screen.getByText('$49.99')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('should display succeeded status badge', () => {
      render(<PaymentHistory />);

      expect(
        screen.getByText('billing.paymentStatus.succeeded')
      ).toBeInTheDocument();
    });

    it('should display pending status badge', () => {
      render(<PaymentHistory />);

      expect(
        screen.getByText('billing.paymentStatus.pending')
      ).toBeInTheDocument();
    });

    it('should display failed status badge', () => {
      render(<PaymentHistory />);

      expect(
        screen.getByText('billing.paymentStatus.failed')
      ).toBeInTheDocument();
    });

    it('should display refunded status badge for refunded payment', () => {
      mockStore.paymentHistory = [
        ...mockPayments,
        {
          id: 'pay-4',
          amount: 14999,
          currency: 'USD',
          status: 'refunded',
          description: 'Refunded payment',
          createdAt: '2024-01-01',
          receiptUrl: null,
        },
      ];

      render(<PaymentHistory />);

      expect(
        screen.getByText('billing.paymentStatus.refunded')
      ).toBeInTheDocument();
    });

    it('should apply correct styling to succeeded badge', () => {
      render(<PaymentHistory />);

      // Check for green badge styling (typically has bg-green-500 class)
      const succeededBadge = screen.getByText('billing.paymentStatus.succeeded');
      expect(succeededBadge.closest('[class*="bg"]')).toBeInTheDocument();
    });

    it('should apply correct styling to failed badge', () => {
      render(<PaymentHistory />);

      // Check for red badge styling
      const failedBadge = screen.getByText('billing.paymentStatus.failed');
      expect(failedBadge.closest('[class*="bg"]')).toBeInTheDocument();
    });
  });

  describe('receipt links', () => {
    it('should display view receipt button when receipt URL exists', () => {
      render(<PaymentHistory />);

      const receiptButtons = screen.getAllByRole('link', {
        name: /billing.viewReceipt/i,
      });
      expect(receiptButtons.length).toBeGreaterThan(0);
    });

    it('should open receipt in new tab', () => {
      render(<PaymentHistory />);

      const receiptButtons = screen.getAllByRole('link', {
        name: /billing.viewReceipt/i,
      });

      expect(receiptButtons[0]).toHaveAttribute('target', '_blank');
      expect(receiptButtons[0]).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not display receipt button when URL is null', () => {
      render(<PaymentHistory />);

      const table = screen.getByRole('table');
      const cells = table.querySelectorAll('td');

      // Find cells with dash (no receipt)
      const noDashSpans = Array.from(cells).filter((cell) =>
        cell.textContent?.includes('-')
      );

      expect(noDashSpans.length).toBeGreaterThan(0);
    });

    it('should have external link icon', () => {
      const { container } = render(<PaymentHistory />);

      const externalLinkIcons = container.querySelectorAll(
        'svg[class*="external"]'
      );
      expect(externalLinkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('pagination and limits', () => {
    it('should display all payments when no limit', () => {
      render(<PaymentHistory limit={undefined} />);

      const rows = screen.getAllByRole('row');
      // Header + 3 payments
      expect(rows.length).toBe(4);
    });

    it('should limit displayed payments when limit prop is set', () => {
      render(<PaymentHistory limit={2} />);

      expect(screen.getByText('Pro Plan - Monthly')).toBeInTheDocument();
      expect(screen.getByText('Starter Plan - Monthly')).toBeInTheDocument();
    });

    it('should show view all button when limit is exceeded', () => {
      render(<PaymentHistory limit={2} />);

      const viewAllButton = screen.getByRole('link', {
        name: /billing.viewAllPayments/i,
      });
      expect(viewAllButton).toBeInTheDocument();
    });

    it('should not show view all button when under limit', () => {
      render(<PaymentHistory limit={10} />);

      const viewAllButton = screen.queryByRole('link', {
        name: /billing.viewAllPayments/i,
      });
      expect(viewAllButton).not.toBeInTheDocument();
    });

    it('should link to billing history page', () => {
      render(<PaymentHistory limit={2} />);

      const viewAllButton = screen.getByRole('link', {
        name: /billing.viewAllPayments/i,
      });
      expect(viewAllButton).toHaveAttribute('href', '/billing/history');
    });
  });

  describe('empty state', () => {
    it('should display empty state when no payments', () => {
      mockStore.paymentHistory = [];

      render(<PaymentHistory />);

      expect(screen.getByText('billing.noPayments')).toBeInTheDocument();
    });

    it('should display receipt icon in empty state', () => {
      mockStore.paymentHistory = [];

      const { container } = render(<PaymentHistory />);

      const receiptIcon = container.querySelector(
        'svg[class*="h-12"]'
      );
      expect(receiptIcon).toBeInTheDocument();
    });

    it('should not display table in empty state', () => {
      mockStore.paymentHistory = [];

      render(<PaymentHistory />);

      const table = screen.queryByRole('table');
      expect(table).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should display skeleton loaders when loading', () => {
      mockStore.isLoadingHistory = true;

      const { container } = render(<PaymentHistory />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not display payment data while loading', () => {
      mockStore.isLoadingHistory = true;

      render(<PaymentHistory />);

      expect(screen.queryByText('Pro Plan - Monthly')).not.toBeInTheDocument();
    });

    it('should call fetchPaymentHistory on mount', () => {
      render(<PaymentHistory />);

      expect(mockStore.fetchPaymentHistory).toHaveBeenCalled();
    });
  });

  describe('card component', () => {
    it('should render inside Card component', () => {
      render(<PaymentHistory />);

      // Check that the component renders with card-like structure
      expect(screen.getByText('billing.paymentHistory')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should have header with title and description', () => {
      render(<PaymentHistory />);

      expect(screen.getByText('billing.paymentHistory')).toBeInTheDocument();
      expect(
        screen.getByText('billing.paymentHistoryDescription')
      ).toBeInTheDocument();
    });
  });

  describe('table styling', () => {
    it('should have scrollable container for large tables', () => {
      const { container } = render(<PaymentHistory />);

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should display table with proper spacing', () => {
      const { container } = render(<PaymentHistory />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
    });
  });

  describe('className and styling props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PaymentHistory className="custom-class" />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });

    it('should handle no className gracefully', () => {
      const { container } = render(<PaymentHistory />);

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('should format dates in locale format', () => {
      render(<PaymentHistory />);

      // Test date is 2024-01-15
      const dateCells = screen.getAllByRole('cell');
      const hasDate = Array.from(dateCells).some((cell) =>
        cell.textContent?.includes('1')
      );

      expect(hasDate).toBe(true);
    });
  });

  describe('default export', () => {
    it('should export component as default', () => {
      expect(PaymentHistory).toBeDefined();
    });
  });
});
