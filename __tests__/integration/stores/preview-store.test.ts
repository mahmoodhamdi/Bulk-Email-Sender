import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { usePreviewStore, type Contact } from '@/stores/preview-store';

describe('Preview Store Integration', () => {
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

  describe('Full Preview Workflow', () => {
    it('should complete full preview workflow', async () => {
      // Step 1: Open preview with content
      act(() => {
        usePreviewStore.getState().openPreview({
          subject: 'Hello {{firstName}}!',
          html: '<h1>Welcome {{firstName}} {{lastName}}</h1><p>From {{company}}</p><a href="#">Unsubscribe</a>',
          text: 'Welcome {{firstName}}!',
        });
      });

      expect(usePreviewStore.getState().isPreviewOpen).toBe(true);

      // Step 2: Set preview contact for personalization
      const contact: Contact = {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Corp',
      };

      act(() => {
        usePreviewStore.getState().setPreviewContact(contact);
      });

      // Step 3: Verify merge tags are replaced
      const renderedContent = usePreviewStore.getState().getRenderedContent();
      expect(renderedContent).toContain('John');
      expect(renderedContent).toContain('Doe');
      expect(renderedContent).toContain('Acme Corp');
      expect(renderedContent).not.toContain('{{firstName}}');

      const renderedSubject = usePreviewStore.getState().getRenderedSubject();
      expect(renderedSubject).toBe('Hello John!');

      // Step 4: Analyze spam
      await act(async () => {
        await usePreviewStore.getState().analyzeSpam();
      });

      const analysis = usePreviewStore.getState().spamAnalysis;
      expect(analysis).not.toBeNull();
      expect(analysis!.rating).toBeDefined();

      // Step 5: Close preview
      act(() => {
        usePreviewStore.getState().closePreview();
      });

      expect(usePreviewStore.getState().isPreviewOpen).toBe(false);
      expect(usePreviewStore.getState().spamAnalysis).toBeNull();
    });

    it('should switch between preview devices', () => {
      act(() => {
        usePreviewStore.getState().openPreview({ html: '<p>Test</p>' });
      });

      // Test desktop
      act(() => {
        usePreviewStore.getState().setPreviewMode('desktop');
      });
      expect(usePreviewStore.getState().getDeviceDimensions()).toEqual({ width: 800, height: 600 });

      // Test tablet
      act(() => {
        usePreviewStore.getState().setPreviewMode('tablet');
      });
      expect(usePreviewStore.getState().getDeviceDimensions()).toEqual({ width: 768, height: 1024 });

      // Test mobile
      act(() => {
        usePreviewStore.getState().setPreviewMode('mobile');
      });
      expect(usePreviewStore.getState().getDeviceDimensions()).toEqual({ width: 375, height: 667 });
    });

    it('should switch between tabs', () => {
      act(() => {
        usePreviewStore.getState().openPreview({ html: '<p>Test</p>' });
      });

      expect(usePreviewStore.getState().activeTab).toBe('preview');

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

  describe('Test Send Workflow', () => {
    it('should manage test email workflow', async () => {
      // Add test emails
      act(() => {
        usePreviewStore.getState().addTestEmail('test1@example.com');
        usePreviewStore.getState().addTestEmail('test2@example.com');
      });

      expect(usePreviewStore.getState().testEmails).toHaveLength(2);

      // Send test (mock)
      await act(async () => {
        await usePreviewStore.getState().sendTestEmail();
      });

      // Check results
      const results = usePreviewStore.getState().testResults;
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      });

      // Clear results
      act(() => {
        usePreviewStore.getState().clearTestResults();
      });

      expect(usePreviewStore.getState().testResults).toHaveLength(0);
    });

    it('should not send when no emails added', async () => {
      await act(async () => {
        await usePreviewStore.getState().sendTestEmail();
      });

      expect(usePreviewStore.getState().testResults).toHaveLength(0);
    });

    it('should not send while already sending', async () => {
      act(() => {
        usePreviewStore.getState().addTestEmail('test@example.com');
        usePreviewStore.setState({ testSending: true });
      });

      await act(async () => {
        await usePreviewStore.getState().sendTestEmail();
      });

      // Results should be empty because send was blocked
      expect(usePreviewStore.getState().testResults).toHaveLength(0);
    });
  });

  describe('Spam Analysis Workflow', () => {
    it('should analyze clean email correctly', async () => {
      act(() => {
        usePreviewStore.getState().setSubject('Weekly Newsletter');
        usePreviewStore.getState().setHtmlContent(
          '<p>Hello! Here is your weekly update.</p><a href="#">Unsubscribe</a>'
        );
      });

      await act(async () => {
        await usePreviewStore.getState().analyzeSpam();
      });

      const analysis = usePreviewStore.getState().spamAnalysis;
      expect(analysis!.rating).toBe('excellent');
      expect(analysis!.score).toBeLessThanOrEqual(10);
    });

    it('should analyze spammy email correctly', async () => {
      act(() => {
        usePreviewStore.getState().setSubject('FREE!!! WIN MONEY NOW!!!');
        usePreviewStore.getState().setHtmlContent(
          '<p style="display:none">Hidden spam</p><img src="1.jpg"><img src="2.jpg">'
        );
      });

      await act(async () => {
        await usePreviewStore.getState().analyzeSpam();
      });

      const analysis = usePreviewStore.getState().spamAnalysis;
      expect(analysis!.rating).toBe('poor');
      expect(analysis!.score).toBeGreaterThan(60);
      expect(analysis!.issues.length).toBeGreaterThan(3);
    });

    it('should allow re-analysis', async () => {
      act(() => {
        usePreviewStore.getState().setSubject('First subject');
        usePreviewStore.getState().setHtmlContent('<p>First content</p><a href="#">Unsubscribe</a>');
      });

      await act(async () => {
        await usePreviewStore.getState().analyzeSpam();
      });

      const firstAnalysis = usePreviewStore.getState().spamAnalysis;
      const firstCheckedAt = firstAnalysis!.checkedAt;

      // Wait a bit and re-analyze with different content
      await new Promise((resolve) => setTimeout(resolve, 10));

      act(() => {
        usePreviewStore.getState().setSubject('FREE!!! SPAM!!!');
      });

      await act(async () => {
        await usePreviewStore.getState().analyzeSpam();
      });

      const secondAnalysis = usePreviewStore.getState().spamAnalysis;
      expect(secondAnalysis!.checkedAt.getTime()).toBeGreaterThan(firstCheckedAt.getTime());
      expect(secondAnalysis!.score).toBeGreaterThan(firstAnalysis!.score);
    });
  });

  describe('Personalization Preview', () => {
    it('should update rendered content when contact changes', () => {
      act(() => {
        usePreviewStore.getState().setHtmlContent('<p>Hello {{firstName}} from {{company}}</p>');
      });

      const contact1: Contact = {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
        company: 'Company A',
      };

      act(() => {
        usePreviewStore.getState().setPreviewContact(contact1);
      });

      expect(usePreviewStore.getState().getRenderedContent()).toBe('<p>Hello John from Company A</p>');

      const contact2: Contact = {
        id: '2',
        email: 'jane@example.com',
        firstName: 'Jane',
        company: 'Company B',
      };

      act(() => {
        usePreviewStore.getState().setPreviewContact(contact2);
      });

      expect(usePreviewStore.getState().getRenderedContent()).toBe('<p>Hello Jane from Company B</p>');
    });

    it('should handle contact with custom fields', () => {
      act(() => {
        usePreviewStore.getState().setHtmlContent(
          '<p>Welcome {{firstName}}! Your plan: {{plan}}. Location: {{city}}</p>'
        );
      });

      const contact: Contact = {
        id: '1',
        email: 'user@example.com',
        firstName: 'Test',
        customFields: {
          plan: 'Premium',
          city: 'New York',
        },
      };

      act(() => {
        usePreviewStore.getState().setPreviewContact(contact);
      });

      const rendered = usePreviewStore.getState().getRenderedContent();
      expect(rendered).toBe('<p>Welcome Test! Your plan: Premium. Location: New York</p>');
    });
  });

  describe('Email Client Preview', () => {
    it('should switch between email clients', () => {
      const clients: Array<'default' | 'gmail' | 'outlook' | 'apple'> = ['default', 'gmail', 'outlook', 'apple'];

      clients.forEach((client) => {
        act(() => {
          usePreviewStore.getState().setEmailClient(client);
        });
        expect(usePreviewStore.getState().emailClient).toBe(client);
      });
    });

    it('should toggle dark mode for preview', () => {
      expect(usePreviewStore.getState().darkMode).toBe(false);

      act(() => {
        usePreviewStore.getState().setDarkMode(true);
      });
      expect(usePreviewStore.getState().darkMode).toBe(true);

      act(() => {
        usePreviewStore.getState().setDarkMode(false);
      });
      expect(usePreviewStore.getState().darkMode).toBe(false);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state through tab switches', async () => {
      act(() => {
        usePreviewStore.getState().openPreview({
          subject: 'Test',
          html: '<p>Content</p>',
        });
        usePreviewStore.getState().addTestEmail('test@example.com');
        usePreviewStore.getState().setPreviewMode('mobile');
      });

      // Switch tabs
      act(() => {
        usePreviewStore.getState().setActiveTab('test');
      });

      // State should persist
      expect(usePreviewStore.getState().previewMode).toBe('mobile');
      expect(usePreviewStore.getState().testEmails).toContain('test@example.com');
      expect(usePreviewStore.getState().subject).toBe('Test');

      // Switch back
      act(() => {
        usePreviewStore.getState().setActiveTab('preview');
      });

      // State still persists
      expect(usePreviewStore.getState().previewMode).toBe('mobile');
    });

    it('should clear transient state on close', async () => {
      act(() => {
        usePreviewStore.getState().openPreview({ html: '<p>Test</p>' });
        usePreviewStore.getState().addTestEmail('test@example.com');
      });

      await act(async () => {
        await usePreviewStore.getState().sendTestEmail();
        await usePreviewStore.getState().analyzeSpam();
      });

      // Verify state exists
      expect(usePreviewStore.getState().testResults.length).toBeGreaterThan(0);
      expect(usePreviewStore.getState().spamAnalysis).not.toBeNull();

      // Close
      act(() => {
        usePreviewStore.getState().closePreview();
      });

      // Transient state should be cleared
      expect(usePreviewStore.getState().testResults).toEqual([]);
      expect(usePreviewStore.getState().spamAnalysis).toBeNull();

      // But content state remains for reopening
      expect(usePreviewStore.getState().htmlContent).toBe('<p>Test</p>');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      act(() => {
        usePreviewStore.getState().setPreviewContact({
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
        });
      });

      expect(usePreviewStore.getState().getRenderedContent()).toBe('');
      expect(usePreviewStore.getState().getRenderedSubject()).toBe('');
    });

    it('should handle special characters in content', () => {
      act(() => {
        usePreviewStore.getState().setHtmlContent('<p>Hello {{firstName}}! Email: <test@example.com></p>');
        usePreviewStore.getState().setPreviewContact({
          id: '1',
          email: 'user@example.com',
          firstName: 'O\'Brien',
        });
      });

      const rendered = usePreviewStore.getState().getRenderedContent();
      expect(rendered).toContain("O'Brien");
    });

    it('should handle RTL content', () => {
      act(() => {
        usePreviewStore.getState().setSubject('مرحبا {{firstName}}');
        usePreviewStore.getState().setHtmlContent('<p dir="rtl">أهلاً {{firstName}}!</p>');
        usePreviewStore.getState().setPreviewContact({
          id: '1',
          email: 'user@example.com',
          firstName: 'أحمد',
        });
      });

      expect(usePreviewStore.getState().getRenderedSubject()).toBe('مرحبا أحمد');
      expect(usePreviewStore.getState().getRenderedContent()).toContain('أحمد');
    });
  });
});
