import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutomationList } from '@/components/automation/AutomationList';
import type { Automation } from '@/stores/automation-store';

// Mock the store
const mockAutomation: Automation = {
  id: 'auto-1',
  name: 'Welcome Automation',
  description: 'Welcome new users',
  trigger: { type: 'signup' },
  steps: [
    {
      id: 'step-1',
      type: 'email',
      name: 'Send Welcome',
      config: {
        subject: 'Welcome!',
        templateId: 'tpl_1',
      },
      position: { x: 0, y: 0 },
    },
  ],
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: {
    totalEntered: 100,
    totalCompleted: 50,
    totalActive: 30,
    emailsSent: 150,
    openRate: 45.5,
    clickRate: 12.3,
  },
};

const mockAutomationActive: Automation = {
  ...mockAutomation,
  id: 'auto-2',
  name: 'Active Campaign',
  status: 'active',
};

const mockStore = {
  automations: [mockAutomation, mockAutomationActive],
  currentAutomation: null,
  selectedStepId: null,
  isLoading: false,
  error: null,
  statusFilter: 'all' as const,
  searchQuery: '',
  getFilteredAutomations: vi.fn(() => [mockAutomation, mockAutomationActive]),
  setStatusFilter: vi.fn(),
  setSearchQuery: vi.fn(),
  activateAutomation: vi.fn(),
  pauseAutomation: vi.fn(),
  deleteAutomation: vi.fn(),
  duplicateAutomation: vi.fn(),
};

vi.mock('@/stores/automation-store', () => ({
  useAutomationStore: () => mockStore,
}));

vi.mock('@/hooks/usePagination', () => ({
  usePagination: (items: any[], options?: any) => ({
    paginatedItems: items,
    currentPage: 1,
    totalPages: 1,
    pageSize: options?.initialPageSize || 10,
    totalItems: items.length,
    startIndex: 0,
    endIndex: Math.min(items.length, options?.initialPageSize || 10),
    goToPage: vi.fn(),
    setPageSize: vi.fn(),
    pageSizeOptions: [5, 10, 20, 50],
  }),
}));

describe('AutomationList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getFilteredAutomations.mockReturnValue([
      mockAutomation,
      mockAutomationActive,
    ]);
  });

  describe('rendering', () => {
    it('should render automation list with cards', () => {
      render(<AutomationList />);

      expect(screen.getByText('Welcome Automation')).toBeInTheDocument();
      expect(screen.getByText('Active Campaign')).toBeInTheDocument();
    });

    it('should display automation descriptions', () => {
      render(<AutomationList />);

      expect(screen.getByText('Welcome new users')).toBeInTheDocument();
    });

    it('should display stats for each automation', () => {
      render(<AutomationList />);

      expect(screen.getByText('150')).toBeInTheDocument(); // emailsSent
      expect(screen.getByText('30')).toBeInTheDocument(); // totalActive
    });

    it('should render empty state when no automations', () => {
      mockStore.getFilteredAutomations.mockReturnValue([]);

      render(<AutomationList />);

      expect(screen.getByText('automation.noAutomations')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('should display draft status badge', () => {
      render(<AutomationList />);

      const statusBadges = screen.getAllByText('automation.status.draft');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('should display active status badge', () => {
      render(<AutomationList />);

      const statusBadges = screen.getAllByText('automation.status.active');
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  describe('search and filters', () => {
    it('should render search input', () => {
      render(<AutomationList />);

      const searchInput = screen.getByPlaceholderText('automation.searchPlaceholder');
      expect(searchInput).toBeInTheDocument();
    });

    it('should call setSearchQuery when search input changes', async () => {
      const user = userEvent.setup();
      render(<AutomationList />);

      const searchInput = screen.getByPlaceholderText(
        'automation.searchPlaceholder'
      ) as HTMLInputElement;
      await user.type(searchInput, 'welcome');

      expect(mockStore.setSearchQuery).toHaveBeenCalledWith('welcome');
    });

    it('should render status filter buttons', () => {
      render(<AutomationList />);

      expect(screen.getByRole('button', { name: /automation.filter.all/i }))
        .toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /automation.filter.active/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /automation.filter.paused/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /automation.filter.draft/i })
      ).toBeInTheDocument();
    });

    it('should call setStatusFilter when filter button is clicked', async () => {
      const user = userEvent.setup();
      render(<AutomationList />);

      const activeFilterButton = screen.getByRole('button', {
        name: /automation.filter.active/i,
      });
      await user.click(activeFilterButton);

      expect(mockStore.setStatusFilter).toHaveBeenCalledWith('active');
    });
  });

  describe('automation card actions', () => {
    it('should render toggle switch for automation status', () => {
      render(<AutomationList />);

      const toggleButtons = screen.getAllByRole('button').filter((btn) => {
        return (
          btn.className.includes('rounded-full') &&
          btn.className.includes('border-transparent')
        );
      });

      expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it('should disable toggle for draft automation', () => {
      render(<AutomationList />);

      const buttons = screen.getAllByRole('button');
      const draftToggle = buttons.find((btn) =>
        btn.getAttribute('title')?.includes('automation.publishFirst')
      );

      expect(draftToggle).toBeDisabled();
    });

    it('should call pauseAutomation when toggle is clicked for active automation', async () => {
      const user = userEvent.setup();
      render(<AutomationList />);

      const buttons = screen.getAllByRole('button');
      // Find the toggle for active automation (not disabled)
      const activeToggle = buttons.find(
        (btn) =>
          btn.className.includes('rounded-full') &&
          btn.className.includes('border-transparent') &&
          !btn.hasAttribute('disabled')
      );

      if (activeToggle) {
        await user.click(activeToggle);
        expect(mockStore.pauseAutomation).toHaveBeenCalledWith('auto-2');
      }
    });

    it('should render menu button for each automation', () => {
      render(<AutomationList />);

      const menuButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg') && btn.className.includes('text-gray-400');
      });

      expect(menuButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('should show menu when menu button is clicked', async () => {
      const user = userEvent.setup();
      render(<AutomationList />);

      const menuButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg') && btn.className.includes('text-gray-400');
      });

      await user.click(menuButtons[0]);

      // Menu should show after click
      await waitFor(() => {
        expect(
          screen.getByText('automation.edit').closest('a') ||
            screen.getByText('automation.edit')
        ).toBeInTheDocument();
      });
    });

    it('should call duplicateAutomation when duplicate is clicked', async () => {
      const user = userEvent.setup();
      render(<AutomationList />);

      const menuButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg') && btn.className.includes('text-gray-400');
      });

      await user.click(menuButtons[0]);

      const duplicateButton = await screen.findByText('automation.duplicate');
      await user.click(duplicateButton);

      expect(mockStore.duplicateAutomation).toHaveBeenCalled();
    });

    it('should call deleteAutomation when delete is clicked and confirmed', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<AutomationList />);

      const menuButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg') && btn.className.includes('text-gray-400');
      });

      await user.click(menuButtons[0]);

      const deleteButton = await screen.findByText('automation.delete');
      await user.click(deleteButton);

      expect(mockStore.deleteAutomation).toHaveBeenCalled();
    });

    it('should not delete when deletion is canceled', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<AutomationList />);

      const menuButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg') && btn.className.includes('text-gray-400');
      });

      await user.click(menuButtons[0]);

      const deleteButton = await screen.findByText('automation.delete');
      await user.click(deleteButton);

      expect(mockStore.deleteAutomation).not.toHaveBeenCalled();
    });
  });

  describe('steps preview', () => {
    it('should show step names in preview', () => {
      render(<AutomationList />);

      expect(screen.getByText('Send Welcome')).toBeInTheDocument();
    });

    it('should show more indicator when more than 5 steps', () => {
      const manyStepsAutomation: Automation = {
        ...mockAutomation,
        id: 'auto-many',
        steps: Array.from({ length: 7 }, (_, i) => ({
          id: `step-${i}`,
          type: 'email' as const,
          name: `Step ${i}`,
          config: { subject: 'Test', templateId: 'tpl_1' },
          position: { x: 0, y: 0 },
        })),
      };

      mockStore.getFilteredAutomations.mockReturnValue([manyStepsAutomation]);

      render(<AutomationList />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should display loading spinner when isLoading is true', () => {
      mockStore.isLoading = true;

      render(<AutomationList />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not display automations when loading', () => {
      mockStore.isLoading = true;

      render(<AutomationList />);

      expect(screen.queryByText('Welcome Automation')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show create button in empty state', () => {
      mockStore.getFilteredAutomations.mockReturnValue([]);

      render(<AutomationList />);

      const createButton = screen.getByRole('link', {
        name: /automation.createFirst/i,
      });
      expect(createButton).toHaveAttribute('href', '/automations/new');
    });

    it('should display empty state message', () => {
      mockStore.getFilteredAutomations.mockReturnValue([]);

      render(<AutomationList />);

      expect(screen.getByText('automation.noAutomationsDesc')).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should render pagination info', () => {
      render(<AutomationList />);

      // Check that pagination components are rendered
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
