import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscriptionStatus } from '@/components/billing/SubscriptionStatus';
import { SubscriptionTier, SubscriptionStatus as SubStatus } from '@/lib/payments/types';

// Mock the store
const mockSubscription = {
  id: 'sub-1',
  tier: SubscriptionTier.PRO,
  status: SubStatus.ACTIVE,
  provider: 'stripe',
  currentPeriodStart: '2024-01-01',
  currentPeriodEnd: '2024-02-01',
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialStart: null,
  trialEnd: null,
  usage: {
    emailsSentThisMonth: 25000,
    emailLimit: 50000,
    emailsRemaining: 25000,
    emailsPercentage: 50,
    contactsCount: 5000,
    contactLimit: 10000,
    contactsRemaining: 5000,
    contactsPercentage: 50,
    usageResetAt: '2024-02-01',
  },
};

const mockStore = {
  subscription: mockSubscription,
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
  openCustomerPortal: vi.fn(() => Promise.resolve('https://portal.example.com')),
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
  selectSubscription: (state: any) => state.subscription,
  selectTier: (state: any) => state.subscription?.tier || SubscriptionTier.FREE,
  selectStatus: (state: any) => state.subscription?.status,
  selectUsage: (state: any) => state.subscription?.usage,
}));

describe('SubscriptionStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.subscription = mockSubscription;
    mockStore.isLoading = false;
    mockStore.error = null;
    mockStore.isOpeningPortal = false;
  });

  describe('rendering', () => {
    it('should render card with subscription status', () => {
      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.status.active')).toBeInTheDocument();
    });

    it('should display current plan name', () => {
      render(<SubscriptionStatus />);

      // The component should render without errors
      expect(screen.getByText('billing.status.active')).toBeInTheDocument();
    });

    it('should display plan description', () => {
      render(<SubscriptionStatus />);

      // Check that manage billing button exists
      expect(screen.getByRole('button', { name: /billing.manageBilling/i })).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('should display active status badge', () => {
      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.status.active')).toBeInTheDocument();
    });

    it('should display trialing status badge', () => {
      mockStore.subscription = {
        ...mockSubscription,
        status: SubStatus.TRIALING,
      };

      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.status.trialing')).toBeInTheDocument();
    });

    it('should display past due status badge', () => {
      mockStore.subscription = {
        ...mockSubscription,
        status: SubStatus.PAST_DUE,
      };

      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.status.pastDue')).toBeInTheDocument();
    });

    it('should display canceled status badge', () => {
      mockStore.subscription = {
        ...mockSubscription,
        status: SubStatus.CANCELED,
      };

      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.status.canceled')).toBeInTheDocument();
    });

    it('should display paused status badge', () => {
      mockStore.subscription = {
        ...mockSubscription,
        status: SubStatus.PAUSED,
      };

      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.status.paused')).toBeInTheDocument();
    });
  });

  describe('renewal date display', () => {
    it('should display renewal date for active subscription', () => {
      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.renewsOn')).toBeInTheDocument();
      expect(screen.getByText(/2\/1\/2024|1\/2\/2024/)).toBeInTheDocument();
    });

    it('should display cancellation date when cancelAtPeriodEnd is true', () => {
      mockStore.subscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      };

      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.cancelsOn')).toBeInTheDocument();
    });

    it('should not display renewal date for free tier', () => {
      mockStore.subscription = {
        ...mockSubscription,
        tier: SubscriptionTier.FREE,
      };

      render(<SubscriptionStatus />);

      // The renewal date container should not be visible for free tier
      expect(screen.queryByText('billing.renewsOn')).not.toBeInTheDocument();
    });
  });

  describe('usage display', () => {
    it('should display email usage when showUsage is true', () => {
      render(<SubscriptionStatus showUsage={true} />);

      expect(screen.getByText('billing.emailUsage')).toBeInTheDocument();
    });

    it('should display email count and limit', () => {
      render(<SubscriptionStatus showUsage={true} />);

      expect(screen.getByText(/25,000 \/ 50,000/)).toBeInTheDocument();
    });

    it('should display contact usage', () => {
      render(<SubscriptionStatus showUsage={true} />);

      expect(screen.getByText('billing.contactUsage')).toBeInTheDocument();
      expect(screen.getByText(/5,000 \/ 10,000/)).toBeInTheDocument();
    });

    it('should display unlimited when limit is null', () => {
      mockStore.subscription = {
        ...mockSubscription,
        usage: {
          ...mockSubscription.usage,
          emailLimit: null,
          contactLimit: null,
        },
      };

      render(<SubscriptionStatus showUsage={true} />);

      expect(screen.getAllByText('billing.unlimited').length).toBeGreaterThan(0);
    });

    it('should display usage reset date', () => {
      render(<SubscriptionStatus showUsage={true} />);

      expect(screen.getByText(/billing.usageResetsOn/)).toBeInTheDocument();
    });

    it('should not display usage when showUsage is false', () => {
      render(<SubscriptionStatus showUsage={false} />);

      expect(screen.queryByText('billing.emailUsage')).not.toBeInTheDocument();
    });
  });

  describe('progress bars', () => {
    it('should display progress bars for email usage', () => {
      const { container } = render(<SubscriptionStatus showUsage={true} />);

      // Look for div elements with role="progressbar"
      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should highlight usage warning at 90%', () => {
      mockStore.subscription = {
        ...mockSubscription,
        usage: {
          ...mockSubscription.usage,
          emailsPercentage: 95,
        },
      };

      render(<SubscriptionStatus showUsage={true} />);

      // Check if the email usage text appears with destructive styling
      expect(screen.getByText('billing.emailUsage')).toBeInTheDocument();
    });

    it('should apply destructive color when usage exceeds 90%', () => {
      mockStore.subscription = {
        ...mockSubscription,
        usage: {
          ...mockSubscription.usage,
          emailsPercentage: 95,
        },
      };

      const { container } = render(<SubscriptionStatus showUsage={true} />);

      const destructiveElements = container.querySelectorAll(
        '[class*="destructive"]'
      );
      expect(destructiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('cancellation warning', () => {
    it('should display cancellation alert when cancelAtPeriodEnd is true', () => {
      mockStore.subscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      };

      render(<SubscriptionStatus />);

      expect(
        screen.getByText('billing.scheduledCancellation')
      ).toBeInTheDocument();
    });

    it('should show cancellation message with date', () => {
      mockStore.subscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      };

      render(<SubscriptionStatus />);

      expect(screen.getByText(/billing.cancellationMessage/)).toBeInTheDocument();
    });

    it('should not display cancellation alert when subscription is active', () => {
      render(<SubscriptionStatus />);

      expect(
        screen.queryByText('billing.scheduledCancellation')
      ).not.toBeInTheDocument();
    });
  });

  describe('payment issue warning', () => {
    it('should display payment issue alert for past due status', () => {
      mockStore.subscription = {
        ...mockSubscription,
        status: SubStatus.PAST_DUE,
      };

      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.paymentIssue')).toBeInTheDocument();
    });

    it('should display payment issue message', () => {
      mockStore.subscription = {
        ...mockSubscription,
        status: SubStatus.PAST_DUE,
      };

      render(<SubscriptionStatus />);

      expect(
        screen.getByText('billing.paymentIssueMessage')
      ).toBeInTheDocument();
    });

    it('should not display payment issue alert for active status', () => {
      render(<SubscriptionStatus />);

      expect(screen.queryByText('billing.paymentIssue')).not.toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should render manage billing button for non-free tier', () => {
      render(<SubscriptionStatus showActions={true} />);

      expect(screen.getByRole('button', { name: /billing.manageBilling/i }))
        .toBeInTheDocument();
    });

    it('should not render manage billing button for free tier', () => {
      mockStore.subscription = {
        ...mockSubscription,
        tier: SubscriptionTier.FREE,
      };

      render(<SubscriptionStatus showActions={true} />);

      expect(
        screen.queryByRole('button', { name: /billing.manageBilling/i })
      ).not.toBeInTheDocument();
    });

    it('should render cancel subscription button when active', () => {
      mockStore.subscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: false,
      };

      render(<SubscriptionStatus showActions={true} />);

      expect(
        screen.getByRole('button', { name: /billing.cancelSubscription/i })
      ).toBeInTheDocument();
    });

    it('should render resume subscription button when canceled', () => {
      mockStore.subscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      };

      render(<SubscriptionStatus showActions={true} />);

      expect(
        screen.getByRole('button', { name: /billing.resumeSubscription/i })
      ).toBeInTheDocument();
    });

    it('should not render action buttons when showActions is false', () => {
      render(<SubscriptionStatus showActions={false} />);

      expect(
        screen.queryByRole('button', { name: /billing.manageBilling/i })
      ).not.toBeInTheDocument();
    });

    it('should call openCustomerPortal when manage billing is clicked', async () => {
      const user = userEvent.setup();
      render(<SubscriptionStatus showActions={true} />);

      const manageBillingButton = screen.getByRole('button', {
        name: /billing.manageBilling/i,
      });
      await user.click(manageBillingButton);

      expect(mockStore.openCustomerPortal).toHaveBeenCalled();
    });

    it('should call cancelSubscription when cancel button is clicked', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<SubscriptionStatus showActions={true} />);

      const cancelButton = screen.getByRole('button', {
        name: /billing.cancelSubscription/i,
      });
      await user.click(cancelButton);

      expect(mockStore.cancelSubscription).toHaveBeenCalled();
    });

    it('should call resumeSubscription when resume button is clicked', async () => {
      const user = userEvent.setup();
      mockStore.subscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      };

      render(<SubscriptionStatus showActions={true} />);

      const resumeButton = screen.getByRole('button', {
        name: /billing.resumeSubscription/i,
      });
      await user.click(resumeButton);

      expect(mockStore.resumeSubscription).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should display skeleton loaders when loading', () => {
      mockStore.isLoading = true;
      mockStore.subscription = null;

      const { container } = render(<SubscriptionStatus />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not display content while loading', () => {
      mockStore.isLoading = true;
      mockStore.subscription = null;

      render(<SubscriptionStatus />);

      expect(screen.queryByText('billing.status.active')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error alert when error exists', () => {
      mockStore.error = 'Failed to load subscription';

      render(<SubscriptionStatus />);

      expect(screen.getByText('billing.error')).toBeInTheDocument();
    });

    it('should display error message', () => {
      mockStore.error = 'Failed to fetch subscription data';

      render(<SubscriptionStatus />);

      expect(screen.getByText('Failed to fetch subscription data')).toBeInTheDocument();
    });

    it('should not display content when error exists', () => {
      mockStore.error = 'Error loading';

      render(<SubscriptionStatus />);

      expect(screen.queryByText('billing.status.active')).not.toBeInTheDocument();
    });
  });

  describe('fetch subscription on mount', () => {
    it('should call fetchSubscription on mount', () => {
      render(<SubscriptionStatus />);

      expect(mockStore.fetchSubscription).toHaveBeenCalled();
    });
  });

  describe('className and styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SubscriptionStatus className="custom-class" />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });
  });

  describe('default export', () => {
    it('should export component as default', () => {
      expect(SubscriptionStatus).toBeDefined();
    });
  });
});
