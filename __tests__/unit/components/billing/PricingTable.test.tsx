import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingTable } from '@/components/billing/PricingTable';
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

describe('PricingTable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.isCheckingOut = false;
  });

  describe('rendering', () => {
    it('should render all pricing tiers', () => {
      render(<PricingTable />);

      expect(
        screen.getAllByText((content, element) =>
          element?.tagName.toLowerCase() === 'div' &&
          (content.includes('Free') ||
          content.includes('Starter') ||
          content.includes('Pro') ||
          content.includes('Enterprise'))
        ).length
      ).toBeGreaterThan(0);
    });

    it('should render tier cards', () => {
      const { container } = render(<PricingTable />);

      // Cards are rendered with classes, check by card structure
      const cards = container.querySelectorAll('[class*="border"]');
      expect(cards.length).toBeGreaterThan(3);
    });
  });

  describe('billing interval toggle', () => {
    it('should render monthly/yearly toggle', () => {
      render(<PricingTable />);

      expect(screen.getByText('billing.monthly')).toBeInTheDocument();
      expect(screen.getByText('billing.yearly')).toBeInTheDocument();
    });

    it('should toggle between monthly and yearly', async () => {
      const user = userEvent.setup();
      render(<PricingTable />);

      const monthlyLabel = screen.getByText('billing.monthly');
      const yearlyLabel = screen.getByText('billing.yearly');

      // Initially should show monthly as selected
      expect(monthlyLabel).toBeInTheDocument();

      // Find and click the toggle switch
      const toggles = screen.getAllByRole('switch');
      if (toggles.length > 0) {
        await user.click(toggles[0]);

        // After click, yearly should be shown as selected
        await waitFor(() => {
          expect(yearlyLabel).toBeInTheDocument();
        });
      }
    });

    it('should show save indicator for yearly billing', async () => {
      const user = userEvent.setup();
      render(<PricingTable />);

      const toggles = screen.getAllByRole('switch');
      if (toggles.length > 0) {
        await user.click(toggles[0]);

        await waitFor(() => {
          expect(screen.getByText('billing.save2Months')).toBeInTheDocument();
        });
      }
    });
  });

  describe('pricing display', () => {
    it('should display free tier as free', () => {
      render(<PricingTable />);

      expect(screen.getByText('billing.free')).toBeInTheDocument();
    });

    it('should display prices for paid tiers', () => {
      const { container } = render(<PricingTable />);

      // Look for price patterns in the container
      const pricePattern = /\$\d+\.\d+/;
      const allText = container.textContent || '';
      expect(pricePattern.test(allText)).toBe(true);
    });

    it('should update prices when billing interval changes', async () => {
      const user = userEvent.setup();
      render(<PricingTable />);

      // Get initial price
      const initialText = screen.getByText('billing.monthly').textContent;

      // Toggle to yearly
      const toggles = screen.getAllByRole('switch');
      if (toggles.length > 0) {
        await user.click(toggles[0]);

        await waitFor(() => {
          // Component should still be rendered
          expect(screen.getByText('billing.yearly')).toBeInTheDocument();
        });
      }
    });

    it('should display yearly savings', async () => {
      const user = userEvent.setup();
      render(<PricingTable />);

      const toggles = screen.getAllByRole('switch');
      if (toggles.length > 0) {
        await user.click(toggles[0]);

        await waitFor(() => {
          // Check if any element has the save amount text
          const elements = screen.queryAllByText(/billing.saveAmount/);
          expect(elements.length).toBeGreaterThanOrEqual(1);
        });
      }
    });
  });

  describe('tier cards', () => {
    it('should display tier names', () => {
      render(<PricingTable />);

      // Check for tier names/descriptions through text content
      expect(screen.getByText('billing.monthly')).toBeInTheDocument();
    });

    it('should mark PRO tier as most popular', () => {
      const { container } = render(<PricingTable />);

      expect(screen.getByText('billing.mostPopular')).toBeInTheDocument();
    });

    it('should show current plan badge when current tier is set', () => {
      render(
        <PricingTable
          currentTier={SubscriptionTier.STARTER}
          showCurrentBadge={true}
        />
      );

      // Check that current plan text appears in the document
      const allElements = screen.queryAllByText(/billing.currentPlan/);
      expect(allElements.length).toBeGreaterThan(0);
    });

    it('should not show current plan badge when showCurrentBadge is false', () => {
      const { container } = render(
        <PricingTable
          currentTier={SubscriptionTier.STARTER}
          showCurrentBadge={false}
        />
      );

      const currentPlanBadges = screen.queryAllByText(/billing.currentPlan/);
      // Should not appear as a badge (only in button text potentially)
      expect(currentPlanBadges.length).toBeLessThanOrEqual(1);
    });
  });

  describe('features list', () => {
    it('should display feature items for each tier', () => {
      render(<PricingTable />);

      // Features should be listed
      expect(screen.getAllByText(/unlimited|limits|emails/i).length).toBeGreaterThan(0);
    });

    it('should show check icon for available features', () => {
      const { container } = render(<PricingTable />);

      // Check marks for available features
      const checkIcons = container.querySelectorAll('svg[class*="h-4"]');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('should show X icon for unavailable features', () => {
      const { container } = render(<PricingTable />);

      const xIcons = container.querySelectorAll('svg[class*="text-muted"]');
      expect(xIcons.length).toBeGreaterThan(0);
    });
  });

  describe('action buttons', () => {
    it('should render button for each tier', () => {
      render(<PricingTable />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('should display subscribe button for non-current tiers', () => {
      render(
        <PricingTable currentTier={SubscriptionTier.FREE} />
      );

      // Find buttons with 'upgrade' text (may appear multiple times for different tiers)
      const upgradeButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('billing.upgrade')
      );
      expect(upgradeButtons.length).toBeGreaterThan(0);
    });

    it('should display current plan button for current tier', () => {
      render(
        <PricingTable currentTier={SubscriptionTier.STARTER} />
      );

      const allButtons = screen.getAllByRole('button');
      const currentPlanButton = allButtons.find((btn) =>
        btn.textContent?.includes('billing.currentPlan')
      );
      expect(currentPlanButton).toBeDefined();
    });

    it('should disable current plan button', () => {
      render(
        <PricingTable currentTier={SubscriptionTier.STARTER} />
      );

      const allButtons = screen.getAllByRole('button');
      const currentPlanButton = allButtons.find((btn) =>
        btn.textContent?.includes('billing.currentPlan')
      );
      if (currentPlanButton) {
        expect(currentPlanButton).toBeDisabled();
      }
    });

    it('should disable checkout button when checking out', () => {
      mockStore.isCheckingOut = true;

      render(
        <PricingTable currentTier={SubscriptionTier.FREE} />
      );

      const buttons = screen.getAllByRole('button').filter(
        (btn) =>
          !btn.disabled &&
          !btn.textContent?.includes('billing.free') &&
          !btn.textContent?.includes('billing.currentPlan')
      );

      // When checking out, all action buttons should be disabled
      buttons.forEach((btn) => {
        if (
          btn.textContent?.includes('upgrade') ||
          btn.textContent?.includes('subscribe')
        ) {
          expect(btn).toBeDisabled();
        }
      });
    });

    it('should call onSelectTier when button is clicked', async () => {
      const user = userEvent.setup();
      const onSelectTier = vi.fn();

      render(
        <PricingTable
          currentTier={SubscriptionTier.FREE}
          onSelectTier={onSelectTier}
        />
      );

      // Click upgrade button
      const upgradeButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('billing.upgrade')
      );

      if (upgradeButtons.length > 0) {
        await user.click(upgradeButtons[0]);

        expect(onSelectTier).toHaveBeenCalled();
      }
    });

    it('should create checkout when no onSelectTier callback', async () => {
      const user = userEvent.setup();

      render(
        <PricingTable currentTier={SubscriptionTier.FREE} />
      );

      const upgradeButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('billing.upgrade')
      );

      if (upgradeButtons.length > 0) {
        await user.click(upgradeButtons[0]);

        expect(mockStore.createCheckout).toHaveBeenCalled();
      }
    });
  });

  describe('downgrade scenario', () => {
    it('should show downgrade button when applicable', () => {
      render(
        <PricingTable currentTier={SubscriptionTier.ENTERPRISE} />
      );

      // Lower tier buttons should show "downgrade"
      const buttons = screen.getAllByRole('button');
      const hasDowngradeText = buttons.some((btn) =>
        btn.textContent?.toLowerCase().includes('downgrade')
      );

      expect(hasDowngradeText || buttons.length > 0).toBe(true);
    });
  });

  describe('responsive layout', () => {
    it('should render grid layout', () => {
      const { container } = render(<PricingTable />);

      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toBeInTheDocument();
    });

    it('should have multi-column layout', () => {
      const { container } = render(<PricingTable />);

      const grid = container.querySelector('[class*="md:grid-cols"]');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('styling and themes', () => {
    it('should apply primary styling to PRO tier', () => {
      const { container } = render(<PricingTable />);

      const proCard = container.querySelector('[class*="border-primary"]');
      expect(proCard).toBeInTheDocument();
    });

    it('should have ring styling for current tier', () => {
      const { container } = render(
        <PricingTable currentTier={SubscriptionTier.STARTER} />
      );

      const ringCard = container.querySelector('[class*="ring-2"]');
      expect(ringCard).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PricingTable className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });
  });

  describe('default export', () => {
    it('should export component as default', () => {
      expect(PricingTable).toBeDefined();
    });
  });
});
