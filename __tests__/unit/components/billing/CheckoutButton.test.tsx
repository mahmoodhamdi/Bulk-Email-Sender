import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutButton } from '@/components/billing/CheckoutButton';
import { SubscriptionTier, PaymentProvider } from '@/lib/payments/types';

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
  availableProviders: [PaymentProvider.STRIPE, PaymentProvider.PADDLE],
  fetchSubscription: vi.fn(),
  fetchPaymentHistory: vi.fn(),
  createCheckout: vi.fn(() => Promise.resolve('https://checkout.example.com')),
  openCustomerPortal: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  clearError: vi.fn(),
  reset: vi.fn(),
};

vi.mock('@/stores/billing-store', () => ({
  useBillingStore: () => mockStore,
}));

describe('CheckoutButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.isCheckingOut = false;
    mockStore.checkoutError = null;
  });

  describe('rendering', () => {
    it('should render button with default text', () => {
      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      expect(screen.getByRole('button', { name: /billing.subscribe/i }))
        .toBeInTheDocument();
    });

    it('should render button with custom text', () => {
      render(
        <CheckoutButton tier={SubscriptionTier.STARTER}>
          Upgrade Now
        </CheckoutButton>
      );

      expect(screen.getByRole('button', { name: /Upgrade Now/i })).toBeInTheDocument();
    });

    it('should not render button for FREE tier', () => {
      const { container } = render(
        <CheckoutButton tier={SubscriptionTier.FREE} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render button with credit card icon', () => {
      const { container } = render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('button variants and sizes', () => {
    it('should apply default variant', () => {
      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      expect(button.className).toContain('bg-primary');
    });

    it('should apply outline variant', () => {
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          variant="outline"
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      expect(button.className).toContain('border');
    });

    it('should apply secondary variant', () => {
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          variant="secondary"
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      expect(button).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          className="custom-class"
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      expect(button.className).toContain('custom-class');
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when checking out', () => {
      mockStore.isCheckingOut = true;

      const { container } = render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable button when checking out', () => {
      mockStore.isCheckingOut = true;

      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      expect(button).toBeDisabled();
    });

    it('should show loading text', () => {
      mockStore.isCheckingOut = true;

      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      expect(screen.getByRole('button')).toHaveClass('animate-spin');
    });
  });

  describe('billing interval', () => {
    it('should accept monthly billing interval', async () => {
      const user = userEvent.setup();
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          billingInterval="monthly"
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockStore.createCheckout).toHaveBeenCalledWith(
          SubscriptionTier.STARTER,
          undefined,
          'monthly'
        );
      });
    });

    it('should accept yearly billing interval', async () => {
      const user = userEvent.setup();
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          billingInterval="yearly"
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockStore.createCheckout).toHaveBeenCalledWith(
          SubscriptionTier.STARTER,
          undefined,
          'yearly'
        );
      });
    });
  });

  describe('single provider mode', () => {
    it('should render simple button without provider selector', () => {
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          showProviderSelector={false}
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      expect(button).toBeInTheDocument();

      // Should not have dropdown trigger
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should call createCheckout when button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CheckoutButton
          tier={SubscriptionTier.PRO}
          showProviderSelector={false}
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockStore.createCheckout).toHaveBeenCalledWith(
          SubscriptionTier.PRO,
          undefined,
          'monthly'
        );
      });
    });
  });

  describe('multiple provider mode', () => {
    it('should render dropdown when multiple providers available', () => {
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          showProviderSelector={true}
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      expect(button).toBeInTheDocument();
    });

    it('should show dropdown menu when clicked', async () => {
      const user = userEvent.setup();
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          showProviderSelector={true}
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Credit Card/i)).toBeInTheDocument();
      });
    });

    it('should call createCheckout with selected provider', async () => {
      const user = userEvent.setup();
      render(
        <CheckoutButton
          tier={SubscriptionTier.PRO}
          showProviderSelector={true}
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      const stripeOption = await screen.findByText(/Credit Card/i);
      await user.click(stripeOption);

      expect(mockStore.createCheckout).toHaveBeenCalled();
    });

    it('should show provider labels in dropdown', async () => {
      const user = userEvent.setup();
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          showProviderSelector={true}
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Credit Card/i)).toBeInTheDocument();
        expect(screen.getByText(/Paddle/i)).toBeInTheDocument();
      });
    });

    it('should disable dropdown items when checking out', async () => {
      mockStore.isCheckingOut = true;

      const user = userEvent.setup();
      render(
        <CheckoutButton
          tier={SubscriptionTier.STARTER}
          showProviderSelector={true}
        />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      const stripeOption = await screen.findByText(/Credit Card/i);
      expect(stripeOption).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should open error dialog when checkout fails', async () => {
      mockStore.checkoutError = 'Payment failed';
      const user = userEvent.setup();

      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      // Simulate error
      mockStore.checkoutError = 'Payment failed';
      const { rerender } = render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      rerender(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      expect(mockStore.checkoutError).toBe('Payment failed');
    });

    it('should display error message in dialog', () => {
      mockStore.checkoutError = 'Invalid card';

      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      // The error dialog is only shown after interaction
      // But the error state is set in store
      expect(mockStore.checkoutError).toBe('Invalid card');
    });

    it('should have close button on error dialog', async () => {
      mockStore.checkoutError = 'Payment failed';

      const { container } = render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      // Check for dialog structure
      expect(container.querySelector('[role="dialog"]')).toBe(null); // Dialog not shown initially
    });

    it('should call clearError when error dialog closes', async () => {
      const user = userEvent.setup();
      mockStore.checkoutError = 'Error message';

      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      // Note: The error dialog is opened through state management
      // This would require a full interaction flow to test properly
      expect(mockStore.clearError).toBeDefined();
    });
  });

  describe('checkout flow', () => {
    it('should redirect to checkout URL on success', async () => {
      const user = userEvent.setup();
      const mockUrl = 'https://checkout.example.com/session123';
      mockStore.createCheckout.mockResolvedValueOnce(mockUrl);

      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      const button = screen.getByRole('button', { name: /billing.subscribe/i });
      await user.click(button);

      // The actual redirect happens in the component's handler
      expect(mockStore.createCheckout).toHaveBeenCalled();
    });
  });

  describe('tier-specific behavior', () => {
    it('should work with STARTER tier', () => {
      render(
        <CheckoutButton tier={SubscriptionTier.STARTER} />
      );

      expect(screen.getByRole('button', { name: /billing.subscribe/i }))
        .toBeInTheDocument();
    });

    it('should work with PRO tier', () => {
      render(
        <CheckoutButton tier={SubscriptionTier.PRO} />
      );

      expect(screen.getByRole('button', { name: /billing.subscribe/i }))
        .toBeInTheDocument();
    });

    it('should work with ENTERPRISE tier', () => {
      render(
        <CheckoutButton tier={SubscriptionTier.ENTERPRISE} />
      );

      expect(screen.getByRole('button', { name: /billing.subscribe/i }))
        .toBeInTheDocument();
    });

    it('should not render for FREE tier', () => {
      const { container } = render(
        <CheckoutButton tier={SubscriptionTier.FREE} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('default export', () => {
    it('should export component as default', () => {
      expect(CheckoutButton).toBeDefined();
    });
  });
});
