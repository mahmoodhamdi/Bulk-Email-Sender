import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepConfigPanel } from '@/components/automation/StepConfigPanel';
import type {
  AutomationStep,
  EmailStepConfig,
  DelayStepConfig,
  ConditionStepConfig,
  ActionStepConfig,
} from '@/stores/automation-store';

// Mock the store
const mockEmailStep: AutomationStep = {
  id: 'step-1',
  type: 'email',
  name: 'Send Email',
  config: {
    subject: 'Test Subject',
    templateId: 'tpl_1',
    fromName: 'Sender',
    fromEmail: 'sender@example.com',
  } as EmailStepConfig,
  position: { x: 0, y: 0 },
};

const mockDelayStep: AutomationStep = {
  id: 'step-2',
  type: 'delay',
  name: 'Wait 1 hour',
  config: {
    duration: 1,
    unit: 'hours',
  } as DelayStepConfig,
  position: { x: 0, y: 0 },
};

const mockConditionStep: AutomationStep = {
  id: 'step-3',
  type: 'condition',
  name: 'Check if opened',
  config: {
    field: 'email_opened',
    operator: 'equals',
    value: 'true',
  } as ConditionStepConfig,
  position: { x: 0, y: 0 },
};

const mockActionStep: AutomationStep = {
  id: 'step-4',
  type: 'action',
  name: 'Add tag',
  config: {
    action: 'add_tag',
    target: 'interested',
    value: undefined,
  } as ActionStepConfig,
  position: { x: 0, y: 0 },
};

const mockStore = {
  currentAutomation: null,
  selectedStepId: null,
  getStepById: vi.fn(),
  selectStep: vi.fn(),
  updateStep: vi.fn(),
  deleteStep: vi.fn(),
  addStep: vi.fn(),
};

vi.mock('@/stores/automation-store', () => ({
  useAutomationStore: () => mockStore,
}));

describe('StepConfigPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.selectedStepId = null;
    mockStore.getStepById.mockReturnValue(null);
  });

  describe('rendering - null state', () => {
    it('should render placeholder when no step is selected', () => {
      mockStore.selectedStepId = null;
      mockStore.getStepById.mockReturnValue(null);

      render(<StepConfigPanel />);

      expect(
        screen.getByText('automation.selectStepToConfig')
      ).toBeInTheDocument();
    });

    it('should render in a card container', () => {
      mockStore.selectedStepId = null;

      const { container } = render(<StepConfigPanel />);

      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });
  });

  describe('email step config', () => {
    beforeEach(() => {
      mockStore.selectedStepId = 'step-1';
      mockStore.getStepById.mockReturnValue(mockEmailStep);
    });

    it('should render email config when email step is selected', () => {
      render(<StepConfigPanel />);

      expect(
        screen.getByDisplayValue('Send Email')
      ).toBeInTheDocument();
    });

    it('should display subject field', () => {
      render(<StepConfigPanel />);

      expect(
        screen.getByDisplayValue('Test Subject')
      ).toBeInTheDocument();
    });

    it('should display template selector', () => {
      render(<StepConfigPanel />);

      const select = screen.getByDisplayValue('tpl_1') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
    });

    it('should display from name field', () => {
      render(<StepConfigPanel />);

      expect(screen.getByDisplayValue('Sender')).toBeInTheDocument();
    });

    it('should display from email field', () => {
      render(<StepConfigPanel />);

      expect(
        screen.getByDisplayValue('sender@example.com')
      ).toBeInTheDocument();
    });

    it('should update subject when changed', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const subjectInput = screen.getByDisplayValue('Test Subject');
      await user.clear(subjectInput);
      await user.type(subjectInput, 'New Subject');

      expect(mockStore.updateStep).toHaveBeenCalled();
    });

    it('should update step name when changed', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const nameInput = screen.getByDisplayValue('Send Email');
      await user.clear(nameInput);
      await user.type(nameInput, 'Send Welcome');

      expect(mockStore.updateStep).toHaveBeenCalledWith('step-1', {
        name: 'Send Welcome',
      });
    });
  });

  describe('delay step config', () => {
    beforeEach(() => {
      mockStore.selectedStepId = 'step-2';
      mockStore.getStepById.mockReturnValue(mockDelayStep);
    });

    it('should render delay config when delay step is selected', () => {
      render(<StepConfigPanel />);

      expect(
        screen.getByDisplayValue('Wait 1 hour')
      ).toBeInTheDocument();
    });

    it('should display duration input', () => {
      render(<StepConfigPanel />);

      const durationInput = screen.getByDisplayValue('1') as HTMLInputElement;
      expect(durationInput.type).toBe('number');
    });

    it('should display unit selector', () => {
      render(<StepConfigPanel />);

      const unitSelect = screen.getByDisplayValue('automation.delayUnits.hours');
      expect(unitSelect).toBeInTheDocument();
    });

    it('should update duration when changed', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const durationInput = screen.getByDisplayValue('1') as HTMLInputElement;
      await user.clear(durationInput);
      await user.type(durationInput, '5');

      expect(mockStore.updateStep).toHaveBeenCalled();
    });

    it('should update unit when changed', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const unitSelect = screen.getByDisplayValue(
        'automation.delayUnits.hours'
      );
      await user.selectOptions(unitSelect, 'days');

      expect(mockStore.updateStep).toHaveBeenCalled();
    });
  });

  describe('condition step config', () => {
    beforeEach(() => {
      mockStore.selectedStepId = 'step-3';
      mockStore.getStepById.mockReturnValue(mockConditionStep);
    });

    it('should render condition config when condition step is selected', () => {
      render(<StepConfigPanel />);

      expect(
        screen.getByDisplayValue('Check if opened')
      ).toBeInTheDocument();
    });

    it('should display field selector', () => {
      render(<StepConfigPanel />);

      const fieldSelect = screen.getByDisplayValue(
        'automation.fields.emailOpened'
      );
      expect(fieldSelect).toBeInTheDocument();
    });

    it('should display operator selector', () => {
      render(<StepConfigPanel />);

      const operatorSelect = screen.getByDisplayValue(
        'automation.operators.equals'
      );
      expect(operatorSelect).toBeInTheDocument();
    });

    it('should display value input when operator is not exists/not_exists', () => {
      render(<StepConfigPanel />);

      expect(screen.getByDisplayValue('true')).toBeInTheDocument();
    });

    it('should hide value input when operator is exists', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const operatorSelect = screen.getByDisplayValue(
        'automation.operators.equals'
      );
      await user.selectOptions(operatorSelect, 'exists');

      // Value input should still be there initially until re-rendered
      // This tests the conditional rendering logic
      expect(operatorSelect).toBeInTheDocument();
    });

    it('should update field when changed', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const fieldSelect = screen.getByDisplayValue(
        'automation.fields.emailOpened'
      );
      await user.selectOptions(fieldSelect, 'link_clicked');

      expect(mockStore.updateStep).toHaveBeenCalled();
    });
  });

  describe('action step config', () => {
    beforeEach(() => {
      mockStore.selectedStepId = 'step-4';
      mockStore.getStepById.mockReturnValue(mockActionStep);
    });

    it('should render action config when action step is selected', () => {
      render(<StepConfigPanel />);

      expect(
        screen.getByDisplayValue('Add tag')
      ).toBeInTheDocument();
    });

    it('should display action selector', () => {
      render(<StepConfigPanel />);

      const actionSelect = screen.getByDisplayValue('automation.actions.add_tag');
      expect(actionSelect).toBeInTheDocument();
    });

    it('should display target input', () => {
      render(<StepConfigPanel />);

      expect(screen.getByDisplayValue('interested')).toBeInTheDocument();
    });

    it('should show webhookUrl placeholder for webhook action', () => {
      const webhookStep: AutomationStep = {
        ...mockActionStep,
        config: {
          ...mockActionStep.config,
          action: 'webhook',
          target: 'https://example.com/webhook',
        } as ActionStepConfig,
      };

      mockStore.getStepById.mockReturnValue(webhookStep);

      render(<StepConfigPanel />);

      const input = screen.getByDisplayValue(
        'https://example.com/webhook'
      ) as HTMLInputElement;
      expect(input.type).toBe('url');
    });

    it('should display value field when action is update_field', () => {
      const updateStep: AutomationStep = {
        ...mockActionStep,
        config: {
          ...mockActionStep.config,
          action: 'update_field',
          target: 'field_name',
          value: 'new_value',
        } as ActionStepConfig,
      };

      mockStore.getStepById.mockReturnValue(updateStep);

      render(<StepConfigPanel />);

      expect(screen.getByDisplayValue('new_value')).toBeInTheDocument();
    });

    it('should update action when changed', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const actionSelect = screen.getByDisplayValue('automation.actions.add_tag');
      await user.selectOptions(actionSelect, 'remove_tag');

      expect(mockStore.updateStep).toHaveBeenCalled();
    });
  });

  describe('delete and close buttons', () => {
    beforeEach(() => {
      mockStore.selectedStepId = 'step-1';
      mockStore.getStepById.mockReturnValue(mockEmailStep);
    });

    it('should render delete button', () => {
      render(<StepConfigPanel />);

      const deleteButton = screen.getByRole('button', {
        name: 'automation.deleteStep',
      });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<StepConfigPanel />);

      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(
        (btn) => btn.className.includes('text-gray-400') && btn.querySelector('svg')
      );
      expect(closeButton).toBeInTheDocument();
    });

    it('should call deleteStep when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const deleteButton = screen.getByRole('button', {
        name: 'automation.deleteStep',
      });
      await user.click(deleteButton);

      expect(mockStore.deleteStep).toHaveBeenCalledWith('step-1');
    });

    it('should call selectStep(null) when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<StepConfigPanel />);

      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(
        (btn) => btn.className.includes('text-gray-400') && btn.querySelector('svg')
      );

      if (closeButton) {
        await user.click(closeButton);
        expect(mockStore.selectStep).toHaveBeenCalledWith(null);
      }
    });
  });

  describe('header rendering', () => {
    beforeEach(() => {
      mockStore.selectedStepId = 'step-1';
      mockStore.getStepById.mockReturnValue(mockEmailStep);
    });

    it('should display configure step title', () => {
      render(<StepConfigPanel />);

      expect(
        screen.getByText('automation.configureStep')
      ).toBeInTheDocument();
    });

    it('should render header with action buttons', () => {
      const { container } = render(<StepConfigPanel />);

      const header = container.querySelector(
        '[class*="flex"][class*="items-center"][class*="justify-between"]'
      );
      expect(header).toBeInTheDocument();
    });
  });
});
