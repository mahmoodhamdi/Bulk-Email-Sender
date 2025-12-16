import { describe, it, expect, beforeEach } from 'vitest';
import { useCampaignStore } from '@/stores/campaign-store';

describe('Campaign Store', () => {
  beforeEach(() => {
    useCampaignStore.getState().resetDraft();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useCampaignStore.getState();
      expect(state.currentStep).toBe(0);
      expect(state.draft.name).toBe('');
      expect(state.draft.subject).toBe('');
      expect(state.draft.previewText).toBe('');
      expect(state.draft.fromName).toBe('');
      expect(state.draft.fromEmail).toBe('');
      expect(state.draft.replyTo).toBe('');
      expect(state.draft.content).toBe('');
      expect(state.draft.templateId).toBeNull();
      expect(state.draft.recipients).toEqual([]);
      expect(state.draft.listIds).toEqual([]);
      expect(state.draft.segmentId).toBeNull();
      expect(state.draft.recipientSource).toBe('manual');
      expect(state.draft.sendNow).toBe(true);
      expect(state.draft.scheduledAt).toBeNull();
      expect(state.draft.enableABTest).toBe(false);
      expect(state.draft.abTestId).toBeNull();
      expect(state.errors).toEqual({});
    });
  });

  describe('Step Navigation', () => {
    it('should set step directly', () => {
      useCampaignStore.getState().setStep(2);
      expect(useCampaignStore.getState().currentStep).toBe(2);
    });

    it('should go to next step when validation passes', () => {
      const store = useCampaignStore.getState();
      store.updateDraft({
        name: 'Test Campaign',
        subject: 'Test Subject',
        fromName: 'Sender',
        fromEmail: 'sender@example.com',
      });
      store.nextStep();
      expect(useCampaignStore.getState().currentStep).toBe(1);
    });

    it('should not go to next step when validation fails', () => {
      useCampaignStore.getState().nextStep();
      expect(useCampaignStore.getState().currentStep).toBe(0);
      expect(useCampaignStore.getState().errors.name).toBeDefined();
    });

    it('should not exceed max step (3)', () => {
      const store = useCampaignStore.getState();
      store.updateDraft({
        name: 'Test',
        subject: 'Test',
        fromName: 'Sender',
        fromEmail: 'test@example.com',
        content: 'Content',
        recipients: ['test@test.com'],
      });
      store.setStep(3);
      store.nextStep();
      expect(useCampaignStore.getState().currentStep).toBe(3);
    });

    it('should go to previous step', () => {
      useCampaignStore.getState().setStep(2);
      useCampaignStore.getState().prevStep();
      expect(useCampaignStore.getState().currentStep).toBe(1);
    });

    it('should not go below step 0', () => {
      useCampaignStore.getState().prevStep();
      expect(useCampaignStore.getState().currentStep).toBe(0);
    });
  });

  describe('Draft Updates', () => {
    it('should update draft fields', () => {
      useCampaignStore.getState().updateDraft({
        name: 'My Campaign',
        subject: 'Hello World',
      });
      const { draft } = useCampaignStore.getState();
      expect(draft.name).toBe('My Campaign');
      expect(draft.subject).toBe('Hello World');
    });

    it('should update recipient source', () => {
      useCampaignStore.getState().updateDraft({
        recipientSource: 'segment',
        segmentId: 'seg-123',
      });
      const { draft } = useCampaignStore.getState();
      expect(draft.recipientSource).toBe('segment');
      expect(draft.segmentId).toBe('seg-123');
    });

    it('should update A/B test settings', () => {
      useCampaignStore.getState().updateDraft({
        enableABTest: true,
        abTestId: 'ab-123',
      });
      const { draft } = useCampaignStore.getState();
      expect(draft.enableABTest).toBe(true);
      expect(draft.abTestId).toBe('ab-123');
    });

    it('should update schedule settings', () => {
      const scheduledDate = new Date('2025-01-01');
      useCampaignStore.getState().updateDraft({
        sendNow: false,
        scheduledAt: scheduledDate,
      });
      const { draft } = useCampaignStore.getState();
      expect(draft.sendNow).toBe(false);
      expect(draft.scheduledAt).toEqual(scheduledDate);
    });
  });

  describe('Error Management', () => {
    it('should set an error', () => {
      useCampaignStore.getState().setError('name', 'Name is required');
      expect(useCampaignStore.getState().errors.name).toBe('Name is required');
    });

    it('should clear a specific error', () => {
      useCampaignStore.getState().setError('name', 'Name is required');
      useCampaignStore.getState().setError('subject', 'Subject is required');
      useCampaignStore.getState().clearError('name');
      expect(useCampaignStore.getState().errors.name).toBeUndefined();
      expect(useCampaignStore.getState().errors.subject).toBe('Subject is required');
    });

    it('should clear all errors', () => {
      useCampaignStore.getState().setError('name', 'Error 1');
      useCampaignStore.getState().setError('subject', 'Error 2');
      useCampaignStore.getState().clearErrors();
      expect(useCampaignStore.getState().errors).toEqual({});
    });
  });

  describe('Step Validation', () => {
    describe('Step 0 - Setup', () => {
      it('should fail when name is empty', () => {
        const result = useCampaignStore.getState().validateStep(0);
        expect(result).toBe(false);
        expect(useCampaignStore.getState().errors.name).toBeDefined();
      });

      it('should fail when subject is empty', () => {
        useCampaignStore.getState().updateDraft({ name: 'Test' });
        const result = useCampaignStore.getState().validateStep(0);
        expect(result).toBe(false);
        expect(useCampaignStore.getState().errors.subject).toBeDefined();
      });

      it('should fail when fromName is empty', () => {
        useCampaignStore.getState().updateDraft({
          name: 'Test',
          subject: 'Subject',
        });
        const result = useCampaignStore.getState().validateStep(0);
        expect(result).toBe(false);
        expect(useCampaignStore.getState().errors.fromName).toBeDefined();
      });

      it('should fail when fromEmail is empty', () => {
        useCampaignStore.getState().updateDraft({
          name: 'Test',
          subject: 'Subject',
          fromName: 'Sender',
        });
        const result = useCampaignStore.getState().validateStep(0);
        expect(result).toBe(false);
        expect(useCampaignStore.getState().errors.fromEmail).toBeDefined();
      });

      it('should fail when fromEmail is invalid', () => {
        useCampaignStore.getState().updateDraft({
          name: 'Test',
          subject: 'Subject',
          fromName: 'Sender',
          fromEmail: 'invalid-email',
        });
        const result = useCampaignStore.getState().validateStep(0);
        expect(result).toBe(false);
        expect(useCampaignStore.getState().errors.fromEmail).toBe('Invalid email format');
      });

      it('should pass with valid setup data', () => {
        useCampaignStore.getState().updateDraft({
          name: 'Test Campaign',
          subject: 'Test Subject',
          fromName: 'Sender',
          fromEmail: 'sender@example.com',
        });
        const result = useCampaignStore.getState().validateStep(0);
        expect(result).toBe(true);
        expect(useCampaignStore.getState().errors).toEqual({});
      });
    });

    describe('Step 1 - Content', () => {
      it('should fail when content is empty', () => {
        const result = useCampaignStore.getState().validateStep(1);
        expect(result).toBe(false);
        expect(useCampaignStore.getState().errors.content).toBeDefined();
      });

      it('should pass with valid content', () => {
        useCampaignStore.getState().updateDraft({
          content: '<h1>Hello World</h1>',
        });
        const result = useCampaignStore.getState().validateStep(1);
        expect(result).toBe(true);
      });
    });

    describe('Step 2 - Recipients', () => {
      it('should fail when no recipients are specified', () => {
        const result = useCampaignStore.getState().validateStep(2);
        expect(result).toBe(false);
        expect(useCampaignStore.getState().errors.recipients).toBeDefined();
      });

      it('should pass with manual recipients', () => {
        useCampaignStore.getState().updateDraft({
          recipients: ['test@example.com'],
        });
        const result = useCampaignStore.getState().validateStep(2);
        expect(result).toBe(true);
      });

      it('should pass with list recipients', () => {
        useCampaignStore.getState().updateDraft({
          listIds: ['list-123'],
        });
        const result = useCampaignStore.getState().validateStep(2);
        expect(result).toBe(true);
      });

      it('should pass with segment recipients', () => {
        useCampaignStore.getState().updateDraft({
          segmentId: 'segment-123',
        });
        const result = useCampaignStore.getState().validateStep(2);
        expect(result).toBe(true);
      });
    });

    describe('Step 3 - Review', () => {
      it('should always pass (no validation)', () => {
        const result = useCampaignStore.getState().validateStep(3);
        expect(result).toBe(true);
      });
    });
  });

  describe('Reset', () => {
    it('should reset draft to initial state', () => {
      useCampaignStore.getState().updateDraft({
        name: 'Test',
        subject: 'Subject',
        content: 'Content',
      });
      useCampaignStore.getState().setStep(2);
      useCampaignStore.getState().setError('name', 'Error');

      useCampaignStore.getState().resetDraft();

      const state = useCampaignStore.getState();
      expect(state.currentStep).toBe(0);
      expect(state.draft.name).toBe('');
      expect(state.errors).toEqual({});
    });
  });
});
