import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  usePreviewStore,
  analyzeEmailForSpam,
  replaceMergeTags,
  SPAM_TRIGGER_WORDS,
  type Contact,
} from '@/stores/preview-store';

describe('Preview Store', () => {
  beforeEach(() => {
    act(() => {
      usePreviewStore.setState({
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
      });
    });
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const state = usePreviewStore.getState();
      expect(state.previewMode).toBe('desktop');
      expect(state.darkMode).toBe(false);
      expect(state.emailClient).toBe('default');
      expect(state.showRawHtml).toBe(false);
      expect(state.subject).toBe('');
      expect(state.htmlContent).toBe('');
      expect(state.testEmails).toEqual([]);
      expect(state.isPreviewOpen).toBe(false);
      expect(state.activeTab).toBe('preview');
    });
  });

  describe('Preview Settings', () => {
    it('should set preview mode', () => {
      act(() => {
        usePreviewStore.getState().setPreviewMode('mobile');
      });
      expect(usePreviewStore.getState().previewMode).toBe('mobile');

      act(() => {
        usePreviewStore.getState().setPreviewMode('tablet');
      });
      expect(usePreviewStore.getState().previewMode).toBe('tablet');
    });

    it('should toggle dark mode', () => {
      act(() => {
        usePreviewStore.getState().setDarkMode(true);
      });
      expect(usePreviewStore.getState().darkMode).toBe(true);

      act(() => {
        usePreviewStore.getState().setDarkMode(false);
      });
      expect(usePreviewStore.getState().darkMode).toBe(false);
    });

    it('should set email client', () => {
      act(() => {
        usePreviewStore.getState().setEmailClient('gmail');
      });
      expect(usePreviewStore.getState().emailClient).toBe('gmail');

      act(() => {
        usePreviewStore.getState().setEmailClient('outlook');
      });
      expect(usePreviewStore.getState().emailClient).toBe('outlook');
    });

    it('should toggle raw HTML view', () => {
      expect(usePreviewStore.getState().showRawHtml).toBe(false);

      act(() => {
        usePreviewStore.getState().toggleRawHtml();
      });
      expect(usePreviewStore.getState().showRawHtml).toBe(true);

      act(() => {
        usePreviewStore.getState().toggleRawHtml();
      });
      expect(usePreviewStore.getState().showRawHtml).toBe(false);
    });
  });

  describe('Content Management', () => {
    it('should set subject', () => {
      act(() => {
        usePreviewStore.getState().setSubject('Test Subject');
      });
      expect(usePreviewStore.getState().subject).toBe('Test Subject');
    });

    it('should set HTML content', () => {
      const html = '<h1>Hello</h1>';
      act(() => {
        usePreviewStore.getState().setHtmlContent(html);
      });
      expect(usePreviewStore.getState().htmlContent).toBe(html);
    });

    it('should set text content', () => {
      act(() => {
        usePreviewStore.getState().setTextContent('Plain text');
      });
      expect(usePreviewStore.getState().textContent).toBe('Plain text');
    });

    it('should set from name and email', () => {
      act(() => {
        usePreviewStore.getState().setFromName('Test Sender');
        usePreviewStore.getState().setFromEmail('test@example.com');
      });
      expect(usePreviewStore.getState().fromName).toBe('Test Sender');
      expect(usePreviewStore.getState().fromEmail).toBe('test@example.com');
    });

    it('should set preview contact', () => {
      const contact: Contact = {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      act(() => {
        usePreviewStore.getState().setPreviewContact(contact);
      });
      expect(usePreviewStore.getState().previewContact).toEqual(contact);

      act(() => {
        usePreviewStore.getState().setPreviewContact(null);
      });
      expect(usePreviewStore.getState().previewContact).toBeNull();
    });
  });

  describe('Test Email Management', () => {
    it('should add test email', () => {
      act(() => {
        usePreviewStore.getState().addTestEmail('test@example.com');
      });
      expect(usePreviewStore.getState().testEmails).toContain('test@example.com');
    });

    it('should not add duplicate emails', () => {
      act(() => {
        usePreviewStore.getState().addTestEmail('test@example.com');
        usePreviewStore.getState().addTestEmail('test@example.com');
      });
      expect(usePreviewStore.getState().testEmails.length).toBe(1);
    });

    it('should limit to 5 test emails', () => {
      act(() => {
        for (let i = 1; i <= 6; i++) {
          usePreviewStore.getState().addTestEmail(`test${i}@example.com`);
        }
      });
      expect(usePreviewStore.getState().testEmails.length).toBe(5);
    });

    it('should remove test email', () => {
      act(() => {
        usePreviewStore.getState().addTestEmail('test1@example.com');
        usePreviewStore.getState().addTestEmail('test2@example.com');
        usePreviewStore.getState().removeTestEmail('test1@example.com');
      });
      expect(usePreviewStore.getState().testEmails).toEqual(['test2@example.com']);
    });

    it('should clear all test emails', () => {
      act(() => {
        usePreviewStore.getState().addTestEmail('test1@example.com');
        usePreviewStore.getState().addTestEmail('test2@example.com');
        usePreviewStore.getState().clearTestEmails();
      });
      expect(usePreviewStore.getState().testEmails).toEqual([]);
    });

    it('should clear test results', () => {
      act(() => {
        usePreviewStore.setState({
          testResults: [
            { success: true, recipient: 'test@example.com', sentAt: new Date() },
          ],
        });
        usePreviewStore.getState().clearTestResults();
      });
      expect(usePreviewStore.getState().testResults).toEqual([]);
    });
  });

  describe('Spam Analysis', () => {
    it('should analyze spam asynchronously', async () => {
      act(() => {
        usePreviewStore.getState().setSubject('Test Subject');
        usePreviewStore.getState().setHtmlContent('<p>Hello World</p><a href="#">Unsubscribe</a>');
      });

      await act(async () => {
        await usePreviewStore.getState().analyzeSpam();
      });

      const state = usePreviewStore.getState();
      expect(state.spamAnalysis).not.toBeNull();
      expect(state.spamAnalysis!.score).toBeGreaterThanOrEqual(0);
      expect(state.spamAnalysis!.rating).toBeDefined();
    });

    it('should clear spam analysis', async () => {
      await act(async () => {
        usePreviewStore.getState().setSubject('Test');
        usePreviewStore.getState().setHtmlContent('<p>Content</p>');
        await usePreviewStore.getState().analyzeSpam();
      });

      expect(usePreviewStore.getState().spamAnalysis).not.toBeNull();

      act(() => {
        usePreviewStore.getState().clearSpamAnalysis();
      });

      expect(usePreviewStore.getState().spamAnalysis).toBeNull();
    });
  });

  describe('UI State', () => {
    it('should open preview with content', () => {
      act(() => {
        usePreviewStore.getState().openPreview({
          subject: 'Test Subject',
          html: '<p>Test</p>',
        });
      });

      const state = usePreviewStore.getState();
      expect(state.isPreviewOpen).toBe(true);
      expect(state.subject).toBe('Test Subject');
      expect(state.htmlContent).toBe('<p>Test</p>');
    });

    it('should close preview and clear results', () => {
      act(() => {
        usePreviewStore.setState({
          isPreviewOpen: true,
          testResults: [{ success: true, recipient: 'test@example.com', sentAt: new Date() }],
          spamAnalysis: { score: 10, rating: 'good', issues: [], checkedAt: new Date() },
        });
        usePreviewStore.getState().closePreview();
      });

      const state = usePreviewStore.getState();
      expect(state.isPreviewOpen).toBe(false);
      expect(state.testResults).toEqual([]);
      expect(state.spamAnalysis).toBeNull();
    });

    it('should set active tab', () => {
      act(() => {
        usePreviewStore.getState().setActiveTab('test');
      });
      expect(usePreviewStore.getState().activeTab).toBe('test');

      act(() => {
        usePreviewStore.getState().setActiveTab('spam');
      });
      expect(usePreviewStore.getState().activeTab).toBe('spam');
    });
  });

  describe('Computed Values', () => {
    it('should get rendered content with merge tags replaced', () => {
      const contact: Contact = {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      act(() => {
        usePreviewStore.getState().setHtmlContent('<p>Hello {{firstName}} {{lastName}}</p>');
        usePreviewStore.getState().setPreviewContact(contact);
      });

      const rendered = usePreviewStore.getState().getRenderedContent();
      expect(rendered).toBe('<p>Hello John Doe</p>');
    });

    it('should get rendered subject with merge tags replaced', () => {
      const contact: Contact = {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
      };

      act(() => {
        usePreviewStore.getState().setSubject('Hi {{firstName}}!');
        usePreviewStore.getState().setPreviewContact(contact);
      });

      const rendered = usePreviewStore.getState().getRenderedSubject();
      expect(rendered).toBe('Hi John!');
    });

    it('should get device dimensions', () => {
      act(() => {
        usePreviewStore.getState().setPreviewMode('desktop');
      });
      expect(usePreviewStore.getState().getDeviceDimensions()).toEqual({ width: 800, height: 600 });

      act(() => {
        usePreviewStore.getState().setPreviewMode('mobile');
      });
      expect(usePreviewStore.getState().getDeviceDimensions()).toEqual({ width: 375, height: 667 });

      act(() => {
        usePreviewStore.getState().setPreviewMode('tablet');
      });
      expect(usePreviewStore.getState().getDeviceDimensions()).toEqual({ width: 768, height: 1024 });
    });
  });
});

describe('Spam Analysis Function', () => {
  it('should return excellent rating for clean email', () => {
    const result = analyzeEmailForSpam(
      'Weekly Newsletter',
      '<p>Hello, check out our latest updates.</p><a href="#">Unsubscribe</a>'
    );
    expect(result.rating).toBe('excellent');
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it('should detect missing subject line', () => {
    const result = analyzeEmailForSpam('', '<p>Content</p>');
    expect(result.issues.some((i) => i.message.includes('Missing subject'))).toBe(true);
  });

  it('should detect missing unsubscribe link', () => {
    const result = analyzeEmailForSpam('Test', '<p>Just some content here</p>');
    expect(result.issues.some((i) => i.message.includes('unsubscribe'))).toBe(true);
  });

  it('should detect ALL CAPS in subject', () => {
    const result = analyzeEmailForSpam('FREE OFFER NOW', '<p>Content</p><a href="#">Unsubscribe</a>');
    expect(result.issues.some((i) => i.message.includes('ALL CAPS'))).toBe(true);
  });

  it('should detect excessive punctuation', () => {
    const result = analyzeEmailForSpam('Great Deal!!!', '<p>Content</p><a href="#">Unsubscribe</a>');
    expect(result.issues.some((i) => i.message.includes('excessive punctuation'))).toBe(true);
  });

  it('should detect spam trigger words in subject', () => {
    const result = analyzeEmailForSpam('Free Money Winner', '<p>Content</p><a href="#">Unsubscribe</a>');
    expect(result.issues.some((i) => i.message.includes('spam trigger words'))).toBe(true);
  });

  it('should detect high image-to-text ratio', () => {
    const result = analyzeEmailForSpam(
      'Test',
      '<img src="test.jpg"/><img src="test2.jpg"/><a href="#">Unsubscribe</a>'
    );
    expect(result.issues.some((i) => i.message.includes('image-to-text'))).toBe(true);
  });

  it('should detect too many links', () => {
    const links = Array.from({ length: 12 }, (_, i) => `<a href="#link${i}">Link ${i}</a>`).join('');
    const result = analyzeEmailForSpam('Test', `<p>Content ${links}</p><a href="#">Unsubscribe</a>`);
    expect(result.issues.some((i) => i.message.includes('links'))).toBe(true);
  });

  it('should detect hidden content', () => {
    const result = analyzeEmailForSpam(
      'Test',
      '<p style="display:none">Hidden</p><p>Visible</p><a href="#">Unsubscribe</a>'
    );
    expect(result.issues.some((i) => i.message.includes('Hidden content'))).toBe(true);
  });

  it('should detect missing alt text on images', () => {
    const result = analyzeEmailForSpam(
      'Test',
      '<p>Content</p><img src="test.jpg"><a href="#">Unsubscribe</a>'
    );
    expect(result.issues.some((i) => i.message.includes('alt text'))).toBe(true);
  });

  it('should return poor rating for spammy email', () => {
    const result = analyzeEmailForSpam(
      'FREE!!! ACT NOW!!! WINNER!!!',
      '<img src="1.jpg"><img src="2.jpg"><p style="display:none">hidden</p>'
    );
    expect(result.rating).toBe('poor');
    expect(result.score).toBeGreaterThan(60);
  });

  it('should cap score at 100', () => {
    const result = analyzeEmailForSpam(
      'FREE!!! URGENT!!! ACT NOW!!! WINNER!!! SPECIAL!!! CLICK HERE!!!',
      ''
    );
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('Merge Tags Replacement', () => {
  const contact: Contact = {
    id: '1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Corp',
    phone: '+1234567890',
    customFields: {
      city: 'New York',
      plan: 'Premium',
    },
  };

  it('should replace firstName tag', () => {
    expect(replaceMergeTags('Hello {{firstName}}', contact)).toBe('Hello John');
  });

  it('should replace lastName tag', () => {
    expect(replaceMergeTags('{{lastName}} family', contact)).toBe('Doe family');
  });

  it('should replace email tag', () => {
    expect(replaceMergeTags('Contact: {{email}}', contact)).toBe('Contact: john@example.com');
  });

  it('should replace company tag', () => {
    expect(replaceMergeTags('Working at {{company}}', contact)).toBe('Working at Acme Corp');
  });

  it('should replace phone tag', () => {
    expect(replaceMergeTags('Call: {{phone}}', contact)).toBe('Call: +1234567890');
  });

  it('should replace fullName tag', () => {
    expect(replaceMergeTags('Dear {{fullName}}', contact)).toBe('Dear John Doe');
  });

  it('should replace custom field tags', () => {
    expect(replaceMergeTags('Location: {{city}}', contact)).toBe('Location: New York');
    expect(replaceMergeTags('Plan: {{plan}}', contact)).toBe('Plan: Premium');
  });

  it('should replace multiple tags', () => {
    const result = replaceMergeTags(
      'Hello {{firstName}} {{lastName}} from {{company}}',
      contact
    );
    expect(result).toBe('Hello John Doe from Acme Corp');
  });

  it('should be case insensitive', () => {
    expect(replaceMergeTags('Hi {{FIRSTNAME}}', contact)).toBe('Hi John');
    expect(replaceMergeTags('Hi {{FirstName}}', contact)).toBe('Hi John');
  });

  it('should handle missing contact', () => {
    expect(replaceMergeTags('Hello {{firstName}}', null)).toBe('Hello {{firstName}}');
  });

  it('should handle missing fields with empty string', () => {
    const partialContact: Contact = {
      id: '2',
      email: 'test@example.com',
    };
    expect(replaceMergeTags('Hello {{firstName}}', partialContact)).toBe('Hello ');
  });

  it('should handle fullName with only firstName', () => {
    const partialContact: Contact = {
      id: '2',
      email: 'test@example.com',
      firstName: 'Jane',
    };
    expect(replaceMergeTags('Dear {{fullName}}', partialContact)).toBe('Dear Jane');
  });
});

describe('Spam Trigger Words', () => {
  it('should contain common spam words', () => {
    expect(SPAM_TRIGGER_WORDS).toContain('free');
    expect(SPAM_TRIGGER_WORDS).toContain('winner');
    expect(SPAM_TRIGGER_WORDS).toContain('urgent');
    expect(SPAM_TRIGGER_WORDS).toContain('act now');
    expect(SPAM_TRIGGER_WORDS).toContain('click here');
  });

  it('should have reasonable number of trigger words', () => {
    expect(SPAM_TRIGGER_WORDS.length).toBeGreaterThan(20);
    expect(SPAM_TRIGGER_WORDS.length).toBeLessThan(100);
  });
});
