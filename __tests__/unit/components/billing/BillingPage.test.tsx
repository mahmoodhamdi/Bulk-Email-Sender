import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillingPage } from '@/components/billing/BillingPage';
import { SubscriptionTier } from '@/lib/payments/types';

// Mock the store
const mockStore = {
  subscription: null,
  isLoading: false,
  error: null,
  paymentHistory: [],
  isLoadingHistory: false,
  checkoutUrl: null,
  isCheckingOut: false,
  checkoutError: null,
  portalUrl: null,
  isOpeningPortal: false,
  availableProviders: [],
  fetchSubscription: vi.fn(),
  fetchPaymentHistory: vi.fn(),
  createCheckout: vi.fn(),
  openCustomerPortal: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  clearError: vi.fn(),
  reset: vi.fn(),
};

vi.mock('@/stores/billing-store', () => ({
  useBillingStore: (selector?: any) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  },
  selectTier: (state: any) => state.subscription?.tier || SubscriptionTier.FREE,
  selectSubscription: (state: any) => state.subscription,
  selectStatus: (state: any) => state.subscription?.status,
  selectUsage: (state: any) => state.subscription?.usage,
  formatPrice: (amount: number) => `$${(amount / 100).toFixed(2)}`,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/components/billing/SubscriptionStatus', () => ({
  SubscriptionStatus: ({ showUsage, showActions }: any) => (
    <div data-testid="subscription-status">
      SubscriptionStatus: showUsage={showUsage} showActions={showActions}
    </div>
  ),
}));

vi.mock('@/components/billing/PricingTable', () => ({
  PricingTable: ({ currentTier, showCurrentBadge }: any) => (
    <div data-testid="pricing-table">
      PricingTable: tier={currentTier} showCurrentBadge={showCurrentBadge}
    </div>
  ),
}));

vi.mock('@/components/billing/PaymentHistory', () => ({
  PaymentHistory: ({ limit }: any) => (
    <div data-testid="payment-history">PaymentHistory: limit={limit}</div>
  ),
}));

describe('BillingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render page heading', () => {
      render(<BillingPage />);

      expect(screen.getByText('billing.billing')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<BillingPage />);

      expect(screen.getByText('billing.billingDescription')).toBeInTheDocument();
    });

    it('should render tabs', () => {
      render(<BillingPage />);

      expect(screen.getByRole('button', { name: /billing.overview/i }))
        .toBeInTheDocument();
      expect(screen.getByRole('button', { name: /billing.plans/i }))
        .toBeInTheDocument();
      expect(screen.getByRole('button', { name: /billing.history/i }))
        .toBeInTheDocument();
    });
  });

  describe('tabs functionality', () => {
    it('should render overview tab by default', () => {
      render(<BillingPage />);

      expect(screen.getByTestId('subscription-status')).toBeInTheDocument();
      expect(screen.getByTestId('payment-history')).toBeInTheDocument();
    });

    it('should switch to plans tab when clicked', async () => {
      const user = userEvent.setup();
      render(<BillingPage />);

      const plansTab = screen.getByRole('button', { name: /billing.plans/i });
      await user.click(plansTab);

      await waitFor(() => {
        expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
      });
    });

    it('should switch to history tab when clicked', async () => {
      const user = userEvent.setup();
      render(<BillingPage />);

      const historyTab = screen.getByRole('button', { name: /billing.history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByTestId('payment-history')).toBeInTheDocument();
      });
    });

    it('should switch back to overview tab', async () => {
      const user = userEvent.setup();
      render(<BillingPage />);

      const plansTab = screen.getByRole('button', { name: /billing.plans/i });
      await user.click(plansTab);

      const overviewTab = screen.getByRole('button', {
        name: /billing.overview/i,
      });
      await user.click(overviewTab);

      await waitFor(() => {
        expect(screen.getByTestId('subscription-status')).toBeInTheDocument();
      });
    });
  });

  describe('success alert', () => {
    it('should display success alert when success query param is true', () => {
      vi.mock('next/navigation', () => ({
        useSearchParams: () =>
          new URLSearchParams('success=true'),
      }));

      render(<BillingPage />);

      expect(screen.getByText('billing.subscriptionSuccess')).toBeInTheDocument();
    });

    it('should call fetchSubscription when success alert appears', async () => {
      vi.mock('next/navigation', () => ({
        useSearchParams: () =>
          new URLSearchParams('success=true'),
      }));

      render(<BillingPage />);

      await waitFor(() => {
        expect(mockStore.fetchSubscription).toHaveBeenCalled();
      });
    });

    it('should display success message', () => {
      vi.mock('next/navigation', () => ({
        useSearchParams: () =>
          new URLSearchParams('success=true'),
      }));

      render(<BillingPage />);

      expect(
        screen.getByText('billing.subscriptionSuccessMessage')
      ).toBeInTheDocument();
    });
  });

  describe('canceled alert', () => {
    it('should display canceled alert when canceled query param is true', () => {
      vi.mock('next/navigation', () => ({
        useSearchParams: () =>
          new URLSearchParams('canceled=true'),
      }));

      render(<BillingPage />);

      expect(screen.getByText('billing.checkoutCanceled')).toBeInTheDocument();
    });

    it('should display canceled message', () => {
      vi.mock('next/navigation', () => ({
        useSearchParams: () =>
          new URLSearchParams('canceled=true'),
      }));

      render(<BillingPage />);

      expect(
        screen.getByText('billing.checkoutCanceledMessage')
      ).toBeInTheDocument();
    });
  });

  describe('overview tab content', () => {
    it('should render SubscriptionStatus component with showUsage and showActions', () => {
      render(<BillingPage />);

      const subscriptionStatus = screen.getByTestId('subscription-status');
      expect(subscriptionStatus).toHaveTextContent('showUsage=true');
      expect(subscriptionStatus).toHaveTextContent('showActions=true');
    });

    it('should render limited PaymentHistory in overview', () => {
      render(<BillingPage />);

      const paymentHistory = screen.getByTestId('payment-history');
      expect(paymentHistory).toHaveTextContent('limit=5');
    });

    it('should render both components in a grid', () => {
      const { container } = render(<BillingPage />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('plans tab content', () => {
    it('should pass currentTier and showCurrentBadge to PricingTable', async () => {
      const user = userEvent.setup();
      render(<BillingPage />);

      const plansTab = screen.getByRole('button', { name: /billing.plans/i });
      await user.click(plansTab);

      await waitFor(() => {
        const pricingTable = screen.getByTestId('pricing-table');
        expect(pricingTable).toHaveTextContent('showCurrentBadge=true');
      });
    });
  });

  describe('history tab content', () => {
    it('should render PaymentHistory without limit in history tab', async () => {
      const user = userEvent.setup();
      render(<BillingPage />);

      const historyTab = screen.getByRole('button', { name: /billing.history/i });
      await user.click(historyTab);

      await waitFor(() => {
        const paymentHistory = screen.getByTestId('payment-history');
        expect(paymentHistory).toBeInTheDocument();
      });
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <BillingPage className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });
  });

  describe('page structure', () => {
    it('should have proper spacing', () => {
      const { container } = render(<BillingPage />);

      const wrapper = container.firstChild;
      expect((wrapper as HTMLElement).className).toContain('space-y-8');
    });
  });

  describe('alerts styling', () => {
    it('should display success alert with correct styling', () => {
      vi.mock('next/navigation', () => ({
        useSearchParams: () =>
          new URLSearchParams('success=true'),
      }));

      const { container } = render(<BillingPage />);

      const alert = container.querySelector('[class*="border-green"]');
      expect(alert).toBeInTheDocument();
    });

    it('should display canceled alert with correct styling', () => {
      vi.mock('next/navigation', () => ({
        useSearchParams: () =>
          new URLSearchParams('canceled=true'),
      }));

      const { container } = render(<BillingPage />);

      const alert = container.querySelector('[class*="border-yellow"]');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('default export', () => {
    it('should export component as default', () => {
      expect(BillingPage).toBeDefined();
    });
  });
});
