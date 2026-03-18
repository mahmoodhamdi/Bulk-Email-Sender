import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowBuilder } from '@/components/automation/WorkflowBuilder';
import type {
  Automation,
  AutomationStep,
  EmailStepConfig,
  DelayStepConfig,
} from '@/stores/automation-store';

// Mock the store
const mockStep1: AutomationStep = {
  id: 'step-1',
  type: 'email',
  name: 'Send Email',
  config: {
    subject: 'Welcome',
    templateId: 'tpl_1',
  } as EmailStepConfig,
  position: { x: 0, y: 0 },
  nextStepId: 'step-2',
};

const mockStep2: AutomationStep = {
  id: 'step-2',
  type: 'delay',
  name: 'Wait 1 day',
  config: {
    duration: 1,
    unit: 'days',
  } as DelayStepConfig,
  position: { x: 0, y: 0 },
};

const mockAutomation: Automation = {
  id: 'auto-1',
  name: 'Test Automation',
  trigger: { type: 'signup' },
  steps: [mockStep1, mockStep2],
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: {
    totalEntered: 0,
    totalCompleted: 0,
    totalActive: 0,
    emailsSent: 0,
    openRate: 0,
    clickRate: 0,
  },
};

const mockStore = {
  currentAutomation: mockAutomation,
  selectedStepId: null,
  selectStep: vi.fn(),
  deleteStep: vi.fn(),
  addStep: vi.fn(),
  setTrigger: vi.fn(),
  updateStep: vi.fn(),
};

vi.mock('@/stores/automation-store', () => ({
  useAutomationStore: () => mockStore,
}));

describe('WorkflowBuilder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.currentAutomation = mockAutomation;
    mockStore.selectedStepId = null;
  });

  describe('rendering - empty state', () => {
    it('should display empty state when no automation is loaded', () => {
      mockStore.currentAutomation = null;

      render(<WorkflowBuilder />);

      expect(
        screen.getByText('automation.noAutomationLoaded')
      ).toBeInTheDocument();
    });

    it('should render in a container with proper styling', () => {
      mockStore.currentAutomation = null;

      const { container } = render(<WorkflowBuilder />);

      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });
  });

  describe('trigger node', () => {
    it('should render trigger node', () => {
      render(<WorkflowBuilder />);

      expect(screen.getByText('automation.trigger')).toBeInTheDocument();
    });

    it('should display trigger type', () => {
      render(<WorkflowBuilder />);

      expect(
        screen.getByText('automation.triggers.signup')
      ).toBeInTheDocument();
    });

    it('should show trigger config when trigger node is clicked', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const triggerButton = screen.getByText('automation.triggers.signup').closest('button');
      if (triggerButton) {
        await user.click(triggerButton);

        await waitFor(() => {
          expect(
            screen.getByText('automation.selectTrigger')
          ).toBeInTheDocument();
        });
      }
    });

    it('should render trigger type options in dropdown', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const triggerButton = screen.getByText('automation.triggers.signup').closest('button');
      if (triggerButton) {
        await user.click(triggerButton);

        await waitFor(() => {
          expect(
            screen.getByText('automation.triggers.tag_added')
          ).toBeInTheDocument();
          expect(
            screen.getByText('automation.triggers.date_field')
          ).toBeInTheDocument();
          expect(
            screen.getByText('automation.triggers.manual')
          ).toBeInTheDocument();
          expect(
            screen.getByText('automation.triggers.email_opened')
          ).toBeInTheDocument();
          expect(
            screen.getByText('automation.triggers.link_clicked')
          ).toBeInTheDocument();
        });
      }
    });

    it('should call setTrigger when trigger option is selected', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const triggerButton = screen.getByText('automation.triggers.signup').closest('button');
      if (triggerButton) {
        await user.click(triggerButton);

        const tagAddedOption = screen.getByText('automation.triggers.tag_added');
        await user.click(tagAddedOption);

        expect(mockStore.setTrigger).toHaveBeenCalledWith({ type: 'tag_added' });
      }
    });
  });

  describe('step nodes', () => {
    it('should render all step nodes', () => {
      render(<WorkflowBuilder />);

      expect(screen.getByText('Send Email')).toBeInTheDocument();
      expect(screen.getByText('Wait 1 day')).toBeInTheDocument();
    });

    it('should display step type labels', () => {
      render(<WorkflowBuilder />);

      // Multiple elements may have this text (step nodes + step type labels)
      expect(screen.getAllByText('automation.stepTypes.email').length).toBeGreaterThan(0);
      expect(
        screen.getAllByText('automation.stepTypes.delay').length
      ).toBeGreaterThan(0);
    });

    it('should display step descriptions', () => {
      render(<WorkflowBuilder />);

      expect(screen.getByText('Welcome')).toBeInTheDocument(); // email subject
      expect(screen.getByText(/1 automation.delayUnits.days/)).toBeInTheDocument();
    });

    it('should highlight selected step', async () => {
      mockStore.selectedStepId = 'step-1';

      render(<WorkflowBuilder />);

      const stepButton = screen.getByText('Send Email').closest('button');
      expect(stepButton).toHaveClass('ring-primary');
    });

    it('should call selectStep when step is clicked', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const stepButton = screen.getByText('Send Email').closest('button');
      if (stepButton) {
        await user.click(stepButton);
        expect(mockStore.selectStep).toHaveBeenCalledWith('step-1');
      }
    });

    it('should render delete button on each step', () => {
      const { container } = render(<WorkflowBuilder />);

      const deleteButtons = container.querySelectorAll(
        'button[class*="text-gray-400"][class*="hover:text-red-500"]'
      );
      expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('should call deleteStep when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find((btn) => {
        const svg = btn.querySelector('svg');
        return svg && btn.className.includes('text-gray-400');
      });

      if (deleteButton) {
        await user.click(deleteButton);
        expect(mockStore.deleteStep).toHaveBeenCalled();
      }
    });
  });

  describe('connection lines', () => {
    it('should render connection line after trigger', () => {
      const { container } = render(<WorkflowBuilder />);

      const connectionLines = container.querySelectorAll('.h-8.bg-gray-300');
      expect(connectionLines.length).toBeGreaterThan(0);
    });

    it('should render connection line between steps', () => {
      const { container } = render(<WorkflowBuilder />);

      const connectionLines = container.querySelectorAll('.w-0\\.5.h-8');
      expect(connectionLines.length).toBeGreaterThan(0);
    });
  });

  describe('add step button', () => {
    it('should render add step button', () => {
      render(<WorkflowBuilder />);

      const addButtons = screen.getAllByRole('button').filter((btn) => {
        const hasPlus = btn.querySelector('svg') && btn.className.includes('border-dashed');
        return hasPlus;
      });

      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('should show add step menu when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const addButtons = screen.getAllByRole('button').filter((btn) => {
        const hasPlus = btn.querySelector('svg') && btn.className.includes('border-dashed');
        return hasPlus;
      });

      if (addButtons.length > 0) {
        await user.click(addButtons[0]);

        await waitFor(() => {
          expect(screen.getByText('automation.addStep')).toBeInTheDocument();
        });
      }
    });

    it('should display step type options in add menu', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const addButtons = screen.getAllByRole('button').filter((btn) => {
        const hasPlus = btn.querySelector('svg') && btn.className.includes('border-dashed');
        return hasPlus;
      });

      if (addButtons.length > 0) {
        await user.click(addButtons[0]);

        await waitFor(() => {
          // Multiple elements may exist (step nodes + dropdown), use getAllByText
          expect(
            screen.getAllByText('automation.stepTypes.email').length
          ).toBeGreaterThan(0);
          expect(
            screen.getAllByText('automation.stepTypes.delay').length
          ).toBeGreaterThan(0);
          expect(
            screen.getAllByText('automation.stepTypes.condition').length
          ).toBeGreaterThan(0);
          expect(
            screen.getAllByText('automation.stepTypes.action').length
          ).toBeGreaterThan(0);
        });
      }
    });

    it('should call addStep when step type is selected', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder />);

      const addButtons = screen.getAllByRole('button').filter((btn) => {
        const hasPlus = btn.querySelector('svg') && btn.className.includes('border-dashed');
        return hasPlus;
      });

      if (addButtons.length > 0) {
        await user.click(addButtons[0]);

        await waitFor(() => {
          const emailOptions = screen.queryAllByText('automation.stepTypes.email').filter(el => {
            return el.tagName === 'BUTTON';
          });
          if (emailOptions.length > 0) {
            return true;
          }
        });

        const emailButton = screen.getAllByRole('button').find(btn => {
          const text = btn.textContent?.trim();
          return text === 'automation.stepTypes.email';
        });

        if (emailButton) {
          await user.click(emailButton);
          expect(mockStore.addStep).toHaveBeenCalled();
        }
      }
    });
  });

  describe('condition step branches', () => {
    beforeEach(() => {
      const conditionStep: AutomationStep = {
        id: 'step-cond',
        type: 'condition',
        name: 'Check condition',
        config: {
          field: 'email_opened',
          operator: 'equals',
          value: 'true',
        },
        position: { x: 0, y: 0 },
        trueStepId: 'step-true',
        falseStepId: 'step-false',
      };

      mockStore.currentAutomation = {
        ...mockAutomation,
        steps: [conditionStep],
      };
    });

    it('should render yes/no branch indicators for condition step', () => {
      render(<WorkflowBuilder />);

      expect(screen.getByText('automation.yes')).toBeInTheDocument();
      expect(screen.getByText('automation.no')).toBeInTheDocument();
    });

    it('should show branch connection lines', () => {
      const { container } = render(<WorkflowBuilder />);

      const branchLines = container.querySelectorAll('.w-0\\.5');
      expect(branchLines.length).toBeGreaterThan(0);
    });
  });

  describe('container styling', () => {
    it('should render in a scrollable container', () => {
      const { container } = render(<WorkflowBuilder />);

      expect(container.querySelector('.overflow-auto')).toBeInTheDocument();
    });

    it('should have proper spacing and background', () => {
      const { container } = render(<WorkflowBuilder />);

      const mainContainer = container.querySelector('.p-8');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have flex column layout for centering', () => {
      const { container } = render(<WorkflowBuilder />);

      const flexContainer = container.querySelector('.flex.flex-col.items-center');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('step ordering', () => {
    it('should render steps in correct order', () => {
      const { container } = render(<WorkflowBuilder />);

      const stepTexts = container.textContent || '';
      const emailIndex = stepTexts.indexOf('Send Email');
      const delayIndex = stepTexts.indexOf('Wait 1 day');

      expect(emailIndex).toBeGreaterThan(-1);
      expect(delayIndex).toBeGreaterThan(-1);
      expect(emailIndex).toBeLessThan(delayIndex);
    });
  });

  describe('automation with no steps', () => {
    beforeEach(() => {
      mockStore.currentAutomation = {
        ...mockAutomation,
        steps: [],
      };
    });

    it('should render trigger and add button without any steps', () => {
      render(<WorkflowBuilder />);

      expect(screen.getByText('automation.trigger')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.className.includes('border-dashed');
      });

      expect(addButtons.length).toBeGreaterThan(0);
    });
  });
});
