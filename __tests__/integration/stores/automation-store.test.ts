import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useAutomationStore,
  type AutomationStep,
  type EmailStepConfig,
  type DelayStepConfig,
  type ConditionStepConfig,
} from '@/stores/automation-store';

describe('Automation Store Integration', () => {
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

  describe('Full Automation Workflow', () => {
    it('should complete full automation creation workflow', async () => {
      // Step 1: Load existing automations
      await act(async () => {
        await useAutomationStore.getState().loadAutomations();
      });

      const initialCount = useAutomationStore.getState().automations.length;
      expect(initialCount).toBeGreaterThan(0);

      // Step 2: Create a new automation
      let automationId: string;
      act(() => {
        automationId = useAutomationStore.getState().createAutomation(
          'Welcome Series',
          'Automated welcome emails for new subscribers'
        );
      });

      let state = useAutomationStore.getState();
      expect(state.automations.length).toBe(initialCount + 1);
      expect(state.currentAutomation).not.toBeNull();
      expect(state.currentAutomation!.name).toBe('Welcome Series');

      // Step 3: Set trigger
      act(() => {
        useAutomationStore.getState().setTrigger({ type: 'signup' });
      });

      state = useAutomationStore.getState();
      expect(state.currentAutomation!.trigger.type).toBe('signup');

      // Step 4: Add email step
      let emailStepId: string;
      act(() => {
        emailStepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().updateStep(emailStepId, {
          name: 'Welcome Email',
          config: {
            templateId: 'tpl-welcome',
            subject: 'Welcome to our community!',
          } as EmailStepConfig,
        });
      });

      state = useAutomationStore.getState();
      expect(state.currentAutomation!.steps.length).toBe(1);
      const emailStep = state.currentAutomation!.steps[0];
      expect(emailStep.name).toBe('Welcome Email');

      // Step 5: Add delay step connected to email
      let delayStepId: string;
      act(() => {
        delayStepId = useAutomationStore.getState().addStep('delay', emailStepId);
        useAutomationStore.getState().updateStep(delayStepId, {
          name: 'Wait 3 days',
          config: { duration: 3, unit: 'days' } as DelayStepConfig,
        });
      });

      state = useAutomationStore.getState();
      expect(state.currentAutomation!.steps.length).toBe(2);
      const connectedEmailStep = state.currentAutomation!.steps.find((s) => s.id === emailStepId);
      expect(connectedEmailStep!.nextStepId).toBe(delayStepId!);

      // Step 6: Add follow-up email
      act(() => {
        const followUpId = useAutomationStore.getState().addStep('email', delayStepId);
        useAutomationStore.getState().updateStep(followUpId, {
          name: 'Getting Started Guide',
          config: {
            templateId: 'tpl-getting-started',
            subject: 'Get the most out of your account',
          } as EmailStepConfig,
        });
      });

      state = useAutomationStore.getState();
      expect(state.currentAutomation!.steps.length).toBe(3);

      // Step 7: Activate the automation
      act(() => {
        useAutomationStore.getState().activateAutomation(automationId!);
      });

      state = useAutomationStore.getState();
      expect(state.currentAutomation!.status).toBe('active');
    });

    it('should handle conditional branching workflow', async () => {
      // Create automation with condition
      act(() => {
        useAutomationStore.getState().createAutomation('Re-engagement');
        useAutomationStore.getState().setTrigger({ type: 'manual' });
      });

      // Add initial email
      let emailStepId: string;
      act(() => {
        emailStepId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().updateStep(emailStepId, {
          name: 'We Miss You',
          config: {
            templateId: 'tpl-miss',
            subject: "We haven't heard from you",
          } as EmailStepConfig,
        });
      });

      // Add delay
      let delayStepId: string;
      act(() => {
        delayStepId = useAutomationStore.getState().addStep('delay', emailStepId);
        useAutomationStore.getState().updateStep(delayStepId, {
          config: { duration: 2, unit: 'days' } as DelayStepConfig,
        });
      });

      // Add condition
      let conditionStepId: string;
      act(() => {
        conditionStepId = useAutomationStore.getState().addStep('condition', delayStepId);
        useAutomationStore.getState().updateStep(conditionStepId, {
          name: 'Opened email?',
          config: {
            field: 'email_opened',
            operator: 'equals',
            value: 'true',
          } as ConditionStepConfig,
        });
      });

      // Add true branch (offer email)
      let offerEmailId: string;
      act(() => {
        offerEmailId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().connectSteps(conditionStepId, offerEmailId, 'true');
        useAutomationStore.getState().updateStep(offerEmailId, {
          name: 'Special Offer',
          config: {
            templateId: 'tpl-offer',
            subject: 'A special offer just for you!',
          } as EmailStepConfig,
        });
      });

      // Add false branch (remove tag)
      let removeTagId: string;
      act(() => {
        removeTagId = useAutomationStore.getState().addStep('action');
        useAutomationStore.getState().connectSteps(conditionStepId, removeTagId, 'false');
      });

      // Verify the branching structure
      const state = useAutomationStore.getState();
      const conditionStep = state.currentAutomation!.steps.find((s) => s.id === conditionStepId);

      expect(conditionStep!.trueStepId).toBe(offerEmailId!);
      expect(conditionStep!.falseStepId).toBe(removeTagId!);
      expect(state.currentAutomation!.steps.length).toBe(5);
    });
  });

  describe('Automation Management Workflow', () => {
    it('should handle pause, edit, and resume workflow', async () => {
      await act(async () => {
        await useAutomationStore.getState().loadAutomations();
      });

      // Find an active automation
      let activeAutomation = useAutomationStore
        .getState()
        .automations.find((a) => a.status === 'active');

      if (!activeAutomation) {
        // Create and activate one
        act(() => {
          const id = useAutomationStore.getState().createAutomation('Test Active');
          useAutomationStore.getState().addStep('email');
          useAutomationStore.getState().activateAutomation(id);
        });
        activeAutomation = useAutomationStore.getState().automations[
          useAutomationStore.getState().automations.length - 1
        ];
      }

      // Pause the automation
      act(() => {
        useAutomationStore.getState().pauseAutomation(activeAutomation!.id);
      });

      let state = useAutomationStore.getState();
      let automation = state.automations.find((a) => a.id === activeAutomation!.id);
      expect(automation!.status).toBe('paused');

      // Edit while paused
      act(() => {
        useAutomationStore.getState().loadAutomation(activeAutomation!.id);
        useAutomationStore.getState().updateAutomation(activeAutomation!.id, {
          name: 'Updated Name',
        });
      });

      state = useAutomationStore.getState();
      expect(state.currentAutomation!.name).toBe('Updated Name');

      // Resume (activate again)
      act(() => {
        useAutomationStore.getState().activateAutomation(activeAutomation!.id);
      });

      state = useAutomationStore.getState();
      automation = state.automations.find((a) => a.id === activeAutomation!.id);
      expect(automation!.status).toBe('active');
    });

    it('should handle duplicate and modify workflow', async () => {
      await act(async () => {
        await useAutomationStore.getState().loadAutomations();
      });

      const originalAutomation = useAutomationStore.getState().automations[0];

      // Duplicate
      let duplicatedId: string;
      act(() => {
        duplicatedId = useAutomationStore.getState().duplicateAutomation(originalAutomation.id);
      });

      let state = useAutomationStore.getState();
      const duplicated = state.automations.find((a) => a.id === duplicatedId);

      expect(duplicated!.name).toBe(`${originalAutomation.name} (Copy)`);
      expect(duplicated!.status).toBe('draft');
      expect(duplicated!.steps.length).toBe(originalAutomation.steps.length);

      // Modify the duplicate
      act(() => {
        useAutomationStore.getState().loadAutomation(duplicatedId);
        useAutomationStore.getState().updateAutomation(duplicatedId, {
          name: 'Modified Duplicate',
          description: 'This is a modified copy',
        });
      });

      state = useAutomationStore.getState();
      expect(state.currentAutomation!.name).toBe('Modified Duplicate');

      // Original should be unchanged
      const original = state.automations.find((a) => a.id === originalAutomation.id);
      expect(original!.name).toBe(originalAutomation.name);
    });
  });

  describe('Step Configuration Workflow', () => {
    it('should configure all step types correctly', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Step Config Test');
      });

      // Add and configure email step
      let emailId: string;
      act(() => {
        emailId = useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().updateStep(emailId, {
          name: 'Custom Email',
          config: {
            templateId: 'tpl-custom',
            templateName: 'Custom Template',
            subject: 'Custom Subject {{firstName}}',
            fromName: 'Marketing Team',
            fromEmail: 'marketing@example.com',
          } as EmailStepConfig,
        });
      });

      // Add and configure delay step
      let delayId: string;
      act(() => {
        delayId = useAutomationStore.getState().addStep('delay', emailId);
        useAutomationStore.getState().updateStep(delayId, {
          name: 'Wait 1 week',
          config: { duration: 1, unit: 'weeks' } as DelayStepConfig,
        });
      });

      // Add and configure condition step
      let conditionId: string;
      act(() => {
        conditionId = useAutomationStore.getState().addStep('condition', delayId);
        useAutomationStore.getState().updateStep(conditionId, {
          name: 'Check engagement',
          config: {
            field: 'link_clicked',
            operator: 'exists',
          } as ConditionStepConfig,
        });
      });

      // Verify all configurations
      const state = useAutomationStore.getState();
      const steps = state.currentAutomation!.steps;

      const email = steps.find((s) => s.id === emailId)!;
      const emailConfig = email.config as EmailStepConfig;
      expect(emailConfig.fromName).toBe('Marketing Team');
      expect(emailConfig.fromEmail).toBe('marketing@example.com');

      const delay = steps.find((s) => s.id === delayId)!;
      const delayConfig = delay.config as DelayStepConfig;
      expect(delayConfig.duration).toBe(1);
      expect(delayConfig.unit).toBe('weeks');

      const condition = steps.find((s) => s.id === conditionId)!;
      const conditionConfig = condition.config as ConditionStepConfig;
      expect(conditionConfig.field).toBe('link_clicked');
      expect(conditionConfig.operator).toBe('exists');
    });
  });

  describe('Filtering and Search Workflow', () => {
    it('should filter and search across automations', async () => {
      await act(async () => {
        await useAutomationStore.getState().loadAutomations();
      });

      // Add custom automations for testing
      act(() => {
        const id1 = useAutomationStore.getState().createAutomation(
          'Marketing Campaign',
          'Monthly newsletter automation'
        );
        useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().activateAutomation(id1);

        const id2 = useAutomationStore.getState().createAutomation(
          'Sales Funnel',
          'Lead nurturing sequence'
        );
        useAutomationStore.getState().addStep('email');
        useAutomationStore.getState().pauseAutomation(id2);

        useAutomationStore.getState().createAutomation(
          'Onboarding Draft',
          'Work in progress'
        );
      });

      // Test status filter
      act(() => {
        useAutomationStore.getState().setStatusFilter('active');
      });
      let filtered = useAutomationStore.getState().getFilteredAutomations();
      filtered.forEach((a) => expect(a.status).toBe('active'));

      act(() => {
        useAutomationStore.getState().setStatusFilter('paused');
      });
      filtered = useAutomationStore.getState().getFilteredAutomations();
      filtered.forEach((a) => expect(a.status).toBe('paused'));

      act(() => {
        useAutomationStore.getState().setStatusFilter('draft');
      });
      filtered = useAutomationStore.getState().getFilteredAutomations();
      filtered.forEach((a) => expect(a.status).toBe('draft'));

      // Test search
      act(() => {
        useAutomationStore.getState().setStatusFilter('all');
        useAutomationStore.getState().setSearchQuery('Marketing');
      });
      filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.some((a) => a.name.includes('Marketing'))).toBe(true);

      // Test combined search and filter
      act(() => {
        useAutomationStore.getState().setStatusFilter('active');
        useAutomationStore.getState().setSearchQuery('marketing');
      });
      filtered = useAutomationStore.getState().getFilteredAutomations();
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      filtered.forEach((a) => {
        expect(a.status).toBe('active');
        expect(
          a.name.toLowerCase().includes('marketing') ||
            a.description?.toLowerCase().includes('marketing')
        ).toBe(true);
      });
    });
  });

  describe('Step Connection Management', () => {
    it('should manage complex step connections', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Connection Test');
      });

      // Create a chain of steps
      let step1: string, step2: string, step3: string, step4: string;
      act(() => {
        step1 = useAutomationStore.getState().addStep('email');
        step2 = useAutomationStore.getState().addStep('delay', step1);
        step3 = useAutomationStore.getState().addStep('condition', step2);
        step4 = useAutomationStore.getState().addStep('action');
      });

      // Verify chain
      let state = useAutomationStore.getState();
      let s1 = state.currentAutomation!.steps.find((s) => s.id === step1);
      let s2 = state.currentAutomation!.steps.find((s) => s.id === step2);

      expect(s1!.nextStepId).toBe(step2!);
      expect(s2!.nextStepId).toBe(step3!);

      // Disconnect step2 from step3
      act(() => {
        useAutomationStore.getState().disconnectSteps(step2, undefined);
      });

      state = useAutomationStore.getState();
      s2 = state.currentAutomation!.steps.find((s) => s.id === step2);
      expect(s2!.nextStepId).toBeUndefined();

      // Reconnect with different step
      act(() => {
        useAutomationStore.getState().connectSteps(step2, step4);
      });

      state = useAutomationStore.getState();
      s2 = state.currentAutomation!.steps.find((s) => s.id === step2);
      expect(s2!.nextStepId).toBe(step4!);
    });

    it('should clean up connections when deleting steps', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Cleanup Test');
      });

      let step1: string, step2: string, step3: string;
      act(() => {
        step1 = useAutomationStore.getState().addStep('email');
        step2 = useAutomationStore.getState().addStep('delay', step1);
        step3 = useAutomationStore.getState().addStep('email', step2);
      });

      // Delete middle step
      act(() => {
        useAutomationStore.getState().deleteStep(step2);
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.steps.length).toBe(2);

      const s1 = state.currentAutomation!.steps.find((s) => s.id === step1);
      expect(s1!.nextStepId).toBeUndefined(); // Connection should be cleared
    });
  });

  describe('Selection State Management', () => {
    it('should manage step selection throughout workflow', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Selection Test');
      });

      // Add multiple steps
      let step1: string, step2: string;
      act(() => {
        step1 = useAutomationStore.getState().addStep('email');
      });

      // Step should be selected after adding
      expect(useAutomationStore.getState().selectedStepId).toBe(step1!);

      act(() => {
        step2 = useAutomationStore.getState().addStep('delay');
      });

      // Newest step should be selected
      expect(useAutomationStore.getState().selectedStepId).toBe(step2!);

      // Manual selection
      act(() => {
        useAutomationStore.getState().selectStep(step1);
      });
      expect(useAutomationStore.getState().selectedStepId).toBe(step1!);

      // Clear selection
      act(() => {
        useAutomationStore.getState().selectStep(null);
      });
      expect(useAutomationStore.getState().selectedStepId).toBeNull();

      // Delete selected step
      act(() => {
        useAutomationStore.getState().selectStep(step1);
        useAutomationStore.getState().deleteStep(step1);
      });
      expect(useAutomationStore.getState().selectedStepId).toBeNull();
    });
  });

  describe('Automation Stats', () => {
    it('should have stats initialized for new automations', () => {
      act(() => {
        useAutomationStore.getState().createAutomation('Stats Test');
      });

      const state = useAutomationStore.getState();
      expect(state.currentAutomation!.stats).toEqual({
        totalEntered: 0,
        totalCompleted: 0,
        totalActive: 0,
        emailsSent: 0,
        openRate: 0,
        clickRate: 0,
      });
    });

    it('should preserve stats from loaded automations', async () => {
      await act(async () => {
        await useAutomationStore.getState().loadAutomations();
      });

      const state = useAutomationStore.getState();
      const automationsWithStats = state.automations.filter(
        (a) => a.stats.emailsSent > 0
      );

      expect(automationsWithStats.length).toBeGreaterThan(0);
      automationsWithStats.forEach((a) => {
        expect(a.stats.totalEntered).toBeGreaterThanOrEqual(0);
        expect(a.stats.openRate).toBeGreaterThanOrEqual(0);
        expect(a.stats.clickRate).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
