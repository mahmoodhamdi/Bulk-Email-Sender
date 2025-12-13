import { create } from 'zustand';

export interface CampaignDraft {
  // Setup
  name: string;
  subject: string;
  previewText: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  // Content
  content: string;
  templateId: string | null;
  // Recipients
  recipients: string[];
  listIds: string[];
  // Schedule
  sendNow: boolean;
  scheduledAt: Date | null;
}

interface CampaignStore {
  // Wizard state
  currentStep: number;
  draft: CampaignDraft;
  errors: Record<string, string>;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateDraft: (data: Partial<CampaignDraft>) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearErrors: () => void;
  validateStep: (step: number) => boolean;
  resetDraft: () => void;
}

const initialDraft: CampaignDraft = {
  name: '',
  subject: '',
  previewText: '',
  fromName: '',
  fromEmail: '',
  replyTo: '',
  content: '',
  templateId: null,
  recipients: [],
  listIds: [],
  sendNow: true,
  scheduledAt: null,
};

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  currentStep: 0,
  draft: initialDraft,
  errors: {},

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep, validateStep } = get();
    if (validateStep(currentStep)) {
      set({ currentStep: Math.min(currentStep + 1, 3) });
    }
  },

  prevStep: () => {
    set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) }));
  },

  updateDraft: (data) => {
    set((state) => ({
      draft: { ...state.draft, ...data },
    }));
  },

  setError: (field, error) => {
    set((state) => ({
      errors: { ...state.errors, [field]: error },
    }));
  },

  clearError: (field) => {
    set((state) => {
      const { [field]: _, ...rest } = state.errors;
      return { errors: rest };
    });
  },

  clearErrors: () => set({ errors: {} }),

  validateStep: (step) => {
    const { draft, clearErrors, setError } = get();
    clearErrors();
    let isValid = true;

    if (step === 0) {
      // Setup validation
      if (!draft.name.trim()) {
        setError('name', 'Campaign name is required');
        isValid = false;
      }
      if (!draft.subject.trim()) {
        setError('subject', 'Subject is required');
        isValid = false;
      }
      if (!draft.fromName.trim()) {
        setError('fromName', 'From name is required');
        isValid = false;
      }
      if (!draft.fromEmail.trim()) {
        setError('fromEmail', 'From email is required');
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.fromEmail)) {
        setError('fromEmail', 'Invalid email format');
        isValid = false;
      }
    } else if (step === 1) {
      // Content validation
      if (!draft.content.trim()) {
        setError('content', 'Email content is required');
        isValid = false;
      }
    } else if (step === 2) {
      // Recipients validation
      if (draft.recipients.length === 0 && draft.listIds.length === 0) {
        setError('recipients', 'At least one recipient is required');
        isValid = false;
      }
    }

    return isValid;
  },

  resetDraft: () => set({ draft: initialDraft, currentStep: 0, errors: {} }),
}));
