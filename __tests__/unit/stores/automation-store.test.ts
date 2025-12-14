import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useAutomationStore,
  generateId,
  generateStepId,
  type Automation,
  type AutomationStep,
  type TriggerConfig,
  type EmailStepConfig,
  type DelayStepConfig,
  type ConditionStepConfig,
  type ActionStepConfig,
} from '@/stores/automation-store';

describe('Automation Store', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
      useAutomationStore.setState({
        automations: [],
        currentAutomation: null,
        selectedStepId: null,
        isLoading: false,
        error: null,
        statusFilter: 'all',
        searchQuery: '',
      });
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAutomationStore.getState();
      expect(state.automations).toEqual([]);
      expect(state.currentAutomation).toBeNull();
      expect(state.selectedStepId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.statusFilter).toBe('all');
      expect(state.searchQuery).toBe('');
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new automation', () => {
      let automationId: string;
      act(() => {
        automationId = useAutomationStore.getState().createAutomation('Test Automation', 'Test description');
      });

      const state = useAutomationStore.getState();
      expect(state.automations.length).toBe(1);
      expect(state.automations[0].name).toBe('Test Automation');
      expect(state.automations[0].description).toBe('Test description');
      expect(state.automations[0].status).toBe('draft');
      expect(state.automations[0].steps).toEqual([]);
      expect(state.currentAutomation).not.toBeNull();
      expect(state.currentAutomation!.id).toBe(automationId!);
    });

    it('should create automation without description', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('No Description');
      });

      const state = useAutomationStore.getState();
      expect(state.automations[0].name).toBe('No Description');
      expect(state.automations[0].description).toBeUndefined();
    });

    it('should update automation', () => {
      let automationId: string;
      act(() => {
        automationId = useAutomationStore.getState().createAutomation('Original');
        useAutomationStore.getState().updateAutomation(automationId, {
          name: 'Updated',
          description: 'New description',
        });
      });

      const state = useAutomationStore.getState();
      expect(state.automations[0].name).toBe('Updated');
      expect(state.automations[0].description).toBe('New description');
    });

    it('should update current automation when updating', () => {
      act(() => {
        const id = useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().updateAutomation(id, { name: 'Updated' });
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.name).toBe('Updated');
    });

    it('should delete automation', () => {
      act(() => {
        const id = useAutomationStore.getState().createAutomation('To Delete');
        useAutomationStore.getState().deleteAutomation(id);
      });

      const state = useAutomationStore.getState();
      expect(state.automations.length).toBe(0);
    });

    it('should clear current automation when deleted', () => {
      act(() => {
        const id = useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().deleteAutomation(id);
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation).toBeNull();
    });

    it('should duplicate automation', () => {
      act(() => {
        const id = useAutomationStore.getState().createAutomation('Original', 'Description');
        useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().duplicateAutomation(id);
      });

      const state = useAutomationStore.getState();
      expect(state.automations.length).toBe(2);
      expect(state.automations[1].name).toBe('Original (Copy)');
      expect(state.automations[1].status).toBe('draft');
      expect(state.automations[1].steps.length).toBe(1);
    });

    it('should return empty string when duplicating non-existent automation', () => {
      let newId: string;
      act(() => {
        newId = useAutomationStore.getState().duplicateAutomation('non-existent');
      });

      expect(newId!).toBe('');
    });
  });

  describe('Loading Automations', () => {
    it('should load automations with mock data', async () => {
      await act(async () => {
        await useAutomationStore.getState().loadAutomations();
      });

      const state = useAutomationStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.automations.length).toBeGreaterThan(0);
    });

    it('should set loading state during load', async () => {
      const loadPromise = act(async () => {
        const promise = useAutomationStore.getState().loadAutomations();
        return promise;
      });

      await loadPromise;

      expect(useAutomationStore.getState().isLoading).toBe(false);
    });
  });

  describe('Current Automation Management', () => {
    it('should load automation by id', () => {
      let automationId: string;
      act(() => {
        automationId = useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().clearCurrentAutomation();
        useAutomationStore.getState().loadAutomation(automationId);
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.id).toBe(automationId!);
    });

    it('should clear current automation', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().clearCurrentAutomation();
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation).toBeNull();
      expect(state.selectedStepId).toBeNull();
    });

    it('should return null when loading non-existent automation', () => {
      act(() => {
        useAutomationStore.getState().loadAutomation('non-existent');
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation).toBeNull();
    });
  });

  describe('Status Management', () => {
    it('should activate automation', () => {
      let automationId: string;
      act(() => {
        automationId = useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().activateAutomation(automationId);
      });

      const state = useAutomationStore.getState();
      expect(state.automations[0].status).toBe('active');
    });

    it('should pause automation', () => {
      let automationId: string;
      act(() => {
        automationId = useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().activateAutomation(automationId);
        useAutomationStore.getState().pauseAutomation(automationId);
      });

      const state = useAutomationStore.getState();
      expect(state.automations[0].status).toBe('paused');
    });
  });

  describe('Trigger Management', () => {
    it('should set trigger', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().setTrigger({ type: 'tag_added', tagId: 'tag-123' });
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.trigger.type).toBe('tag_added');
      expect(state.currentAutomation!.trigger.tagId).toBe('tag-123');
    });

    it('should not set trigger when no current automation', () => {
      act(() => {
        useAutomationStore.getState().setTrigger({ type: 'signup' });
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation).toBeNull();
    });
  });

  describe('Step Management', () => {
    it('should add email step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().addStep('email');
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.steps.length).toBe(1);
      expect(state.currentAutomation!.steps[0].type).toBe('email');
      expect(state.currentAutomation!.steps[0].name).toBe('Send Email');
    });

    it('should add delay step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().addStep('delay');
      });

      const state = useAutomationStore.getState();
      const step = state.currentAutomation!.steps[0];
      expect(step.type).toBe('delay');
      const config = step.config as DelayStepConfig;
      expect(config.duration).toBe(1);
      expect(config.unit).toBe('days');
    });

    it('should add condition step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().addStep('condition');
      });

      const state = useAutomationStore.getState();
      const step = state.currentAutomation!.steps[0];
      expect(step.type).toBe('condition');
      expect(step.name).toBe('If/Else');
    });

    it('should add action step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().addStep('action');
      });

      const state = useAutomationStore.getState();
      const step = state.currentAutomation!.steps[0];
      expect(step.type).toBe('action');
      const config = step.config as ActionStepConfig;
      expect(config.action).toBe('add_tag');
    });

    it('should connect steps when adding after another', () => {
      let firstStepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        firstStepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().addStep('delay', firstStepId);
      });

      const state = useAutomationStore.getState();
      const firstStep = state.currentAutomation!.steps.find((s) => s.id === firstStepId);
      expect(firstStep!.nextStepId).toBe(state.currentAutomation!.steps[1].id);
    });

    it('should select newly added step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        useAutomationStore.getState().addStep('email');
      });

      const state = useAutomationStore.getState();
      expect(state.selectedStepId).toBe(state.currentAutomation!.steps[0].id);
    });

    it('should return empty string when adding step without current automation', () => {
      let stepId: string;
      act(() => {
        stepId = useAutomationStore.getState().addStep('email');
      });

      expect(stepId!).toBe('');
    });

    it('should update step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        const stepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().updateStep(stepId, {
          name: 'Updated Name',
          config: { templateId: 'tpl-123', subject: 'New Subject' } as EmailStepConfig,
        });
      });

      const state = useAutomationStore.getState();
      const step = state.currentAutomation!.steps[0];
      expect(step.name).toBe('Updated Name');
      const config = step.config as EmailStepConfig;
      expect(config.templateId).toBe('tpl-123');
      expect(config.subject).toBe('New Subject');
    });

    it('should delete step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        const stepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().deleteStep(stepId);
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.steps.length).toBe(0);
    });

    it('should clear connections when deleting step', () => {
      let firstStepId: string;
      let secondStepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        firstStepId = useAutomationStore.getState().addStep('email');
        secondStepId = useAutomationStore.getState().addStep('delay', firstStepId);
        useAutomationStore.getState().deleteStep(secondStepId);
      });

      const state = useAutomationStore.getState();
      const firstStep = state.currentAutomation!.steps.find((s) => s.id === firstStepId);
      expect(firstStep!.nextStepId).toBeUndefined();
    });

    it('should clear selected step when deleted', () => {
      let stepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        stepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().selectStep(stepId);
        useAutomationStore.getState().deleteStep(stepId);
      });

      const state = useAutomationStore.getState();
      expect(state.selectedStepId).toBeNull();
    });

    it('should move step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        const stepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().moveStep(stepId, { x: 200, y: 300 });
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.steps[0].position).toEqual({ x: 200, y: 300 });
    });

    it('should connect steps', () => {
      let firstStepId: string;
      let secondStepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        firstStepId = useAutomationStore.getState().addStep('email');
        secondStepId = useAutomationStore.getState().addStep('delay');
        useAutomationStore.getState().connectSteps(firstStepId, secondStepId);
      });

      const state = useAutomationStore.getState();
      const firstStep = state.currentAutomation!.steps.find((s) => s.id === firstStepId);
      expect(firstStep!.nextStepId).toBe(secondStepId!);
    });

    it('should connect condition true branch', () => {
      let conditionStepId: string;
      let emailStepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        conditionStepId = useAutomationStore.getState().addStep('condition');
        emailStepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().connectSteps(conditionStepId, emailStepId, 'true');
      });

      const state = useAutomationStore.getState();
      const conditionStep = state.currentAutomation!.steps.find((s) => s.id === conditionStepId);
      expect(conditionStep!.trueStepId).toBe(emailStepId!);
    });

    it('should connect condition false branch', () => {
      let conditionStepId: string;
      let actionStepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        conditionStepId = useAutomationStore.getState().addStep('condition');
        actionStepId = useAutomationStore.getState().addStep('action');
        useAutomationStore.getState().connectSteps(conditionStepId, actionStepId, 'false');
      });

      const state = useAutomationStore.getState();
      const conditionStep = state.currentAutomation!.steps.find((s) => s.id === conditionStepId);
      expect(conditionStep!.falseStepId).toBe(actionStepId!);
    });

    it('should disconnect steps', () => {
      let firstStepId: string;
      let secondStepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        firstStepId = useAutomationStore.getState().addStep('email');
        secondStepId = useAutomationStore.getState().addStep('delay', firstStepId);
        useAutomationStore.getState().disconnectSteps(firstStepId);
      });

      const state = useAutomationStore.getState();
      const firstStep = state.currentAutomation!.steps.find((s) => s.id === firstStepId);
      expect(firstStep!.nextStepId).toBeUndefined();
    });

    it('should disconnect condition branches', () => {
      let conditionStepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        conditionStepId = useAutomationStore.getState().addStep('condition');
        const emailId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().connectSteps(conditionStepId, emailId, 'true');
        useAutomationStore.getState().disconnectSteps(conditionStepId, 'true');
      });

      const state = useAutomationStore.getState();
      const conditionStep = state.currentAutomation!.steps.find((s) => s.id === conditionStepId);
      expect(conditionStep!.trueStepId).toBeUndefined();
    });

    it('should select step', () => {
      let stepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        stepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().selectStep(null);
        useAutomationStore.getState().selectStep(stepId);
      });

      const state = useAutomationStore.getState();
      expect(state.selectedStepId).toBe(stepId!);
    });

    it('should get step by id', () => {
      let stepId: string;
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
        stepId = useAutomationStore.getState().addStep('email');
      });

      const step = useAutomationStore.getState().getStepById(stepId!);
      expect(step).not.toBeUndefined();
      expect(step!.type).toBe('email');
    });

    it('should return undefined for non-existent step', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test');
      });

      const step = useAutomationStore.getState().getStepById('non-existent');
      expect(step).toBeUndefined();
    });

    it('should return undefined when no current automation', () => {
      const step = useAutomationStore.getState().getStepById('any-id');
      expect(step).toBeUndefined();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      act(() => {
        useAutomationStore.getState().createAutomation('Active Automation');
        useAutomationStore.getState().activateAutomation(
          useAutomationStore.getState().automations[0].id
        );
        useAutomationStore.getState().createAutomation('Paused Automation');
        useAutomationStore.getState().pauseAutomation(
          useAutomationStore.getState().automations[1].id
        );
        useAutomationStore.getState().createAutomation('Draft Automation');
        useAutomationStore.getState().clearCurrentAutomation();
      });
    });

    it('should filter by status - all', () => {
      act(() => {
        useAutomationStore.getState().setStatusFilter('all');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(3);
    });

    it('should filter by status - active', () => {
      act(() => {
        useAutomationStore.getState().setStatusFilter('active');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe('active');
    });

    it('should filter by status - paused', () => {
      act(() => {
        useAutomationStore.getState().setStatusFilter('paused');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe('paused');
    });

    it('should filter by status - draft', () => {
      act(() => {
        useAutomationStore.getState().setStatusFilter('draft');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe('draft');
    });

    it('should filter by search query - name', () => {
      act(() => {
        useAutomationStore.getState().setSearchQuery('Active');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Active Automation');
    });

    it('should filter by search query - case insensitive', () => {
      act(() => {
        useAutomationStore.getState().setSearchQuery('active');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(1);
    });

    it('should filter by search query - description', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Test', 'Unique description');
        useAutomationStore.getState().setSearchQuery('unique');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(1);
    });

    it('should combine filters', () => {
      act(() => {
        useAutomationStore.getState().setStatusFilter('active');
        useAutomationStore.getState().setSearchQuery('active');
      });

      const filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBe(1);
    });

    it('should sort by updated date', () => {
      const filtered = useAutomationStore.getState().getFilteredAutomations();
      for (let i = 0; i < filtered.length - 1; i++) {
        expect(filtered[i].updatedAt.getTime()).toBeGreaterThanOrEqual(
          filtered[i + 1].updatedAt.getTime()
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should clear error', () => {
      act(() => {
        useAutomationStore.setState({ error: 'Test error' });
        useAutomationStore.getState().clearError();
      });

      const state = useAutomationStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Helper Functions', () => {
    it('should generate unique automation ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^auto_/);
    });

    it('should generate unique step ids', () => {
      const id1 = generateStepId();
      const id2 = generateStepId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^step_/);
    });
  });
});
