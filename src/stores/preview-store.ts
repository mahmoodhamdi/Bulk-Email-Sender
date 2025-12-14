'use client';

import { create } from 'zustand';
import { generateShortId } from '@/lib/crypto';

// Types
export interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface TestSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt: Date;
  recipient: string;
}

export interface SpamIssue {
  type: 'error' | 'warning' | 'info';
  category: 'subject' | 'content' | 'technical';
  message: string;
  suggestion?: string;
}

export interface SpamAnalysis {
  score: number; // 0-100, lower is better
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  issues: SpamIssue[];
  checkedAt: Date;
}

export type PreviewDevice = 'desktop' | 'mobile' | 'tablet';
export type EmailClient = 'default' | 'gmail' | 'outlook' | 'apple';

interface PreviewState {
  // Preview settings
  previewMode: PreviewDevice;
  darkMode: boolean;
  emailClient: EmailClient;
  showRawHtml: boolean;

  // Content
  subject: string;
  htmlContent: string;
  textContent: string;
  fromName: string;
  fromEmail: string;
  previewContact: Contact | null;

  // Test send
  testEmails: string[];
  testSending: boolean;
  testResults: TestSendResult[];

  // Spam analysis
  spamAnalysis: SpamAnalysis | null;
  isAnalyzing: boolean;

  // UI state
  isPreviewOpen: boolean;
  activeTab: 'preview' | 'test' | 'spam';
}

interface PreviewActions {
  // Preview settings
  setPreviewMode: (mode: PreviewDevice) => void;
  setDarkMode: (enabled: boolean) => void;
  setEmailClient: (client: EmailClient) => void;
  toggleRawHtml: () => void;

  // Content
  setSubject: (subject: string) => void;
  setHtmlContent: (html: string) => void;
  setTextContent: (text: string) => void;
  setFromName: (name: string) => void;
  setFromEmail: (email: string) => void;
  setPreviewContact: (contact: Contact | null) => void;

  // Test send
  addTestEmail: (email: string) => void;
  removeTestEmail: (email: string) => void;
  clearTestEmails: () => void;
  sendTestEmail: () => Promise<void>;
  clearTestResults: () => void;

  // Spam analysis
  analyzeSpam: () => Promise<void>;
  clearSpamAnalysis: () => void;

  // UI
  openPreview: (content?: { subject?: string; html?: string; text?: string }) => void;
  closePreview: () => void;
  setActiveTab: (tab: 'preview' | 'test' | 'spam') => void;

  // Computed
  getRenderedContent: () => string;
  getRenderedSubject: () => string;
  getDeviceDimensions: () => { width: number; height: number };
}

// Spam trigger words (common spam keywords)
const SPAM_TRIGGER_WORDS = [
  'free', 'winner', 'urgent', 'act now', 'limited time', 'exclusive deal',
  'click here', 'buy now', 'order now', 'special promotion', 'congratulations',
  'you have been selected', 'no obligation', 'risk free', 'guarantee',
  'credit card', 'loan', 'cash bonus', 'million dollars', 'earn money',
  'work from home', 'extra income', 'double your', 'incredible deal',
  'lowest price', 'best price', 'bargain', 'discount', 'save big',
];

// Spam analysis function
function analyzeEmailForSpam(subject: string, htmlContent: string): SpamAnalysis {
  const issues: SpamIssue[] = [];
  let score = 0;

  // Subject line analysis
  if (subject) {
    // Check for ALL CAPS
    const capsWords = subject.split(' ').filter((word) => word.length > 3 && word === word.toUpperCase());
    if (capsWords.length > 0) {
      issues.push({
        type: 'warning',
        category: 'subject',
        message: `Subject contains ${capsWords.length} words in ALL CAPS`,
        suggestion: 'Avoid using ALL CAPS as it triggers spam filters',
      });
      score += capsWords.length * 5;
    }

    // Check for excessive punctuation
    const exclamations = (subject.match(/!/g) || []).length;
    const questions = (subject.match(/\?/g) || []).length;
    if (exclamations > 1 || questions > 2) {
      issues.push({
        type: 'warning',
        category: 'subject',
        message: 'Subject has excessive punctuation',
        suggestion: 'Limit punctuation to improve deliverability',
      });
      score += 10;
    }

    // Check for spam trigger words in subject
    const subjectLower = subject.toLowerCase();
    const foundTriggers = SPAM_TRIGGER_WORDS.filter((word) => subjectLower.includes(word));
    if (foundTriggers.length > 0) {
      issues.push({
        type: 'warning',
        category: 'subject',
        message: `Subject contains spam trigger words: ${foundTriggers.slice(0, 3).join(', ')}${foundTriggers.length > 3 ? '...' : ''}`,
        suggestion: 'Consider rephrasing to avoid common spam words',
      });
      score += foundTriggers.length * 8;
    }

    // Check subject length
    if (subject.length > 100) {
      issues.push({
        type: 'info',
        category: 'subject',
        message: 'Subject line is quite long',
        suggestion: 'Keep subject under 60 characters for best display',
      });
      score += 5;
    }
  } else {
    issues.push({
      type: 'error',
      category: 'subject',
      message: 'Missing subject line',
      suggestion: 'Add a clear, descriptive subject line',
    });
    score += 20;
  }

  // Content analysis
  if (htmlContent) {
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Check for unsubscribe link
    const hasUnsubscribe =
      htmlContent.toLowerCase().includes('unsubscribe') ||
      htmlContent.toLowerCase().includes('إلغاء الاشتراك');
    if (!hasUnsubscribe) {
      issues.push({
        type: 'error',
        category: 'content',
        message: 'Missing unsubscribe link',
        suggestion: 'Add an unsubscribe link to comply with anti-spam laws',
      });
      score += 25;
    }

    // Check image-to-text ratio
    const imgCount = (htmlContent.match(/<img/gi) || []).length;
    const textLength = textContent.length;
    if (imgCount > 0 && textLength < 200) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: 'High image-to-text ratio detected',
        suggestion: 'Add more text content to improve deliverability',
      });
      score += 15;
    }

    // Check link count
    const linkCount = (htmlContent.match(/<a\s/gi) || []).length;
    if (linkCount > 10) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: `Email contains ${linkCount} links`,
        suggestion: 'Too many links may trigger spam filters',
      });
      score += 10;
    }

    // Check for spam trigger words in content
    const contentLower = textContent.toLowerCase();
    const foundContentTriggers = SPAM_TRIGGER_WORDS.filter((word) => contentLower.includes(word));
    if (foundContentTriggers.length > 2) {
      issues.push({
        type: 'info',
        category: 'content',
        message: `Content contains ${foundContentTriggers.length} spam trigger words`,
        suggestion: 'Consider rephrasing to improve deliverability',
      });
      score += foundContentTriggers.length * 3;
    }

    // Check for hidden content
    if (htmlContent.includes('display:none') || htmlContent.includes('display: none')) {
      issues.push({
        type: 'warning',
        category: 'technical',
        message: 'Hidden content detected',
        suggestion: 'Remove display:none styles as they may trigger spam filters',
      });
      score += 15;
    }

    // Check for missing alt text on images
    const imagesWithoutAlt = (htmlContent.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
    if (imagesWithoutAlt > 0) {
      issues.push({
        type: 'info',
        category: 'technical',
        message: `${imagesWithoutAlt} image(s) missing alt text`,
        suggestion: 'Add alt text for accessibility and spam filter compliance',
      });
      score += imagesWithoutAlt * 2;
    }
  } else {
    issues.push({
      type: 'error',
      category: 'content',
      message: 'Email content is empty',
      suggestion: 'Add email content before sending',
    });
    score += 30;
  }

  // Cap score at 100
  score = Math.min(100, score);

  // Determine rating
  let rating: SpamAnalysis['rating'];
  if (score <= 10) rating = 'excellent';
  else if (score <= 30) rating = 'good';
  else if (score <= 60) rating = 'fair';
  else rating = 'poor';

  // If no issues and score is 0, mark as excellent
  if (issues.length === 0) {
    issues.push({
      type: 'info',
      category: 'content',
      message: 'No spam issues detected',
    });
  }

  return {
    score,
    rating,
    issues,
    checkedAt: new Date(),
  };
}

// Replace merge tags with contact data
function replaceMergeTags(content: string, contact: Contact | null): string {
  if (!contact) return content;

  let result = content;

  // Standard merge tags
  result = result.replace(/\{\{firstName\}\}/gi, contact.firstName || '');
  result = result.replace(/\{\{lastName\}\}/gi, contact.lastName || '');
  result = result.replace(/\{\{email\}\}/gi, contact.email || '');
  result = result.replace(/\{\{company\}\}/gi, contact.company || '');
  result = result.replace(/\{\{phone\}\}/gi, contact.phone || '');
  result = result.replace(/\{\{fullName\}\}/gi, [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '');

  // Custom fields
  if (contact.customFields) {
    Object.entries(contact.customFields).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(regex, value || '');
    });
  }

  return result;
}

// Device dimensions
const DEVICE_DIMENSIONS = {
  desktop: { width: 800, height: 600 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

// Initial state
const initialState: PreviewState = {
  previewMode: 'desktop',
  darkMode: false,
  emailClient: 'default',
  showRawHtml: false,
  subject: '',
  htmlContent: '',
  textContent: '',
  fromName: '',
  fromEmail: '',
  previewContact: null,
  testEmails: [],
  testSending: false,
  testResults: [],
  spamAnalysis: null,
  isAnalyzing: false,
  isPreviewOpen: false,
  activeTab: 'preview',
};

// Create store
export const usePreviewStore = create<PreviewState & PreviewActions>((set, get) => ({
  ...initialState,

  // Preview settings
  setPreviewMode: (mode) => set({ previewMode: mode }),
  setDarkMode: (enabled) => set({ darkMode: enabled }),
  setEmailClient: (client) => set({ emailClient: client }),
  toggleRawHtml: () => set((state) => ({ showRawHtml: !state.showRawHtml })),

  // Content
  setSubject: (subject) => set({ subject }),
  setHtmlContent: (html) => set({ htmlContent: html }),
  setTextContent: (text) => set({ textContent: text }),
  setFromName: (name) => set({ fromName: name }),
  setFromEmail: (email) => set({ fromEmail: email }),
  setPreviewContact: (contact) => set({ previewContact: contact }),

  // Test send
  addTestEmail: (email) =>
    set((state) => {
      if (state.testEmails.includes(email)) return state;
      if (state.testEmails.length >= 5) return state; // Max 5 test emails
      return { testEmails: [...state.testEmails, email] };
    }),

  removeTestEmail: (email) =>
    set((state) => ({
      testEmails: state.testEmails.filter((e) => e !== email),
    })),

  clearTestEmails: () => set({ testEmails: [] }),

  sendTestEmail: async () => {
    const state = get();
    if (state.testEmails.length === 0) return;
    if (state.testSending) return;

    set({ testSending: true });

    // Simulate API call - in production, this would call the actual API
    try {
      // Mock test send - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const results: TestSendResult[] = state.testEmails.map((email) => ({
        success: true,
        messageId: `test-${generateShortId(12)}`,
        sentAt: new Date(),
        recipient: email,
      }));

      set({ testResults: results, testSending: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send test email';
      const results: TestSendResult[] = state.testEmails.map((email) => ({
        success: false,
        error: errorMessage,
        sentAt: new Date(),
        recipient: email,
      }));
      set({ testResults: results, testSending: false });
    }
  },

  clearTestResults: () => set({ testResults: [] }),

  // Spam analysis
  analyzeSpam: async () => {
    set({ isAnalyzing: true });

    // Simulate async analysis
    await new Promise((resolve) => setTimeout(resolve, 500));

    const state = get();
    const analysis = analyzeEmailForSpam(state.subject, state.htmlContent);
    set({ spamAnalysis: analysis, isAnalyzing: false });
  },

  clearSpamAnalysis: () => set({ spamAnalysis: null }),

  // UI
  openPreview: (content) =>
    set({
      isPreviewOpen: true,
      ...(content?.subject && { subject: content.subject }),
      ...(content?.html && { htmlContent: content.html }),
      ...(content?.text && { textContent: content.text }),
    }),

  closePreview: () =>
    set({
      isPreviewOpen: false,
      testResults: [],
      spamAnalysis: null,
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  // Computed
  getRenderedContent: () => {
    const state = get();
    return replaceMergeTags(state.htmlContent, state.previewContact);
  },

  getRenderedSubject: () => {
    const state = get();
    return replaceMergeTags(state.subject, state.previewContact);
  },

  getDeviceDimensions: () => {
    const state = get();
    return DEVICE_DIMENSIONS[state.previewMode];
  },
}));

// Export spam analysis function for testing
export { analyzeEmailForSpam, replaceMergeTags, SPAM_TRIGGER_WORDS };
