import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '@/stores/settings-store';

// Mock fetch
global.fetch = vi.fn();

// Store for cookie mock
let cookieValue = '';

// Store original document.cookie descriptor
const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset cookie
    cookieValue = '';
    Object.defineProperty(document, 'cookie', {
      get: () => cookieValue,
      set: (value: string) => { cookieValue = value; },
      configurable: true,
    });

    // Reset store by clearing the persisted state
    localStorage.clear();
    useSettingsStore.setState({
      smtp: {
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
      },
      smtpTestStatus: 'idle',
      smtpTestError: null,
      sending: {
        batchSize: 50,
        delayBetweenBatches: 2,
        maxPerHour: 500,
        retryAttempts: 3,
        trackOpens: true,
        trackClicks: true,
        addUnsubscribeLink: true,
      },
      theme: 'system',
      language: 'en',
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalCookieDescriptor) {
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    }
  });

  describe('Initial State', () => {
    it('should have correct initial SMTP config', () => {
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('gmail');
      expect(smtp.host).toBe('smtp.gmail.com');
      expect(smtp.port).toBe(587);
      expect(smtp.secure).toBe(false);
      expect(smtp.username).toBe('');
      expect(smtp.password).toBe('');
    });

    it('should have correct initial sending settings', () => {
      const { sending } = useSettingsStore.getState();
      expect(sending.batchSize).toBe(50);
      expect(sending.delayBetweenBatches).toBe(2);
      expect(sending.maxPerHour).toBe(500);
      expect(sending.retryAttempts).toBe(3);
      expect(sending.trackOpens).toBe(true);
      expect(sending.trackClicks).toBe(true);
      expect(sending.addUnsubscribeLink).toBe(true);
    });

    it('should have correct initial appearance settings', () => {
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.language).toBe('en');
    });

    it('should have idle SMTP test status', () => {
      const state = useSettingsStore.getState();
      expect(state.smtpTestStatus).toBe('idle');
      expect(state.smtpTestError).toBeNull();
    });
  });

  describe('SMTP Configuration', () => {
    it('should update SMTP fields', () => {
      useSettingsStore.getState().updateSmtp({
        username: 'user@example.com',
        password: 'secret',
      });

      const { smtp } = useSettingsStore.getState();
      expect(smtp.username).toBe('user@example.com');
      expect(smtp.password).toBe('secret');
    });

    it('should reset test status on SMTP update', () => {
      useSettingsStore.setState({ smtpTestStatus: 'success' });
      useSettingsStore.getState().updateSmtp({ username: 'new@example.com' });

      expect(useSettingsStore.getState().smtpTestStatus).toBe('idle');
      expect(useSettingsStore.getState().smtpTestError).toBeNull();
    });

    it('should set Gmail provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('gmail');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('gmail');
      expect(smtp.host).toBe('smtp.gmail.com');
      expect(smtp.port).toBe(587);
    });

    it('should set Outlook provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('outlook');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('outlook');
      expect(smtp.host).toBe('smtp-mail.outlook.com');
    });

    it('should set Yahoo provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('yahoo');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('yahoo');
      expect(smtp.host).toBe('smtp.mail.yahoo.com');
    });

    it('should set SendGrid provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('sendgrid');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('sendgrid');
      expect(smtp.host).toBe('smtp.sendgrid.net');
    });

    it('should set Mailgun provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('mailgun');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('mailgun');
      expect(smtp.host).toBe('smtp.mailgun.org');
    });

    it('should set AWS SES provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('ses');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('ses');
      expect(smtp.host).toBe('email-smtp.us-east-1.amazonaws.com');
    });

    it('should set Zoho provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('zoho');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('zoho');
      expect(smtp.host).toBe('smtp.zoho.com');
    });

    it('should set custom provider preset', () => {
      useSettingsStore.getState().setSmtpProvider('custom');
      const { smtp } = useSettingsStore.getState();
      expect(smtp.provider).toBe('custom');
      expect(smtp.host).toBe('');
    });

    it('should not change state for unknown provider', () => {
      const originalHost = useSettingsStore.getState().smtp.host;
      useSettingsStore.getState().setSmtpProvider('unknown-provider');
      expect(useSettingsStore.getState().smtp.host).toBe(originalHost);
    });
  });

  describe('SMTP Connection Test', () => {
    it('should test connection successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await useSettingsStore.getState().testSmtpConnection();

      expect(result).toBe(true);
      expect(useSettingsStore.getState().smtpTestStatus).toBe('success');
      expect(useSettingsStore.getState().smtpTestError).toBeNull();
    });

    it('should handle connection failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Invalid credentials' }),
      } as Response);

      const result = await useSettingsStore.getState().testSmtpConnection();

      expect(result).toBe(false);
      expect(useSettingsStore.getState().smtpTestStatus).toBe('failed');
      expect(useSettingsStore.getState().smtpTestError).toBe('Invalid credentials');
    });

    it('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await useSettingsStore.getState().testSmtpConnection();

      expect(result).toBe(false);
      expect(useSettingsStore.getState().smtpTestStatus).toBe('failed');
      expect(useSettingsStore.getState().smtpTestError).toBe('Network error');
    });

    it('should handle non-Error exception', async () => {
      vi.mocked(fetch).mockRejectedValueOnce('Unknown error');

      const result = await useSettingsStore.getState().testSmtpConnection();

      expect(result).toBe(false);
      expect(useSettingsStore.getState().smtpTestStatus).toBe('failed');
      expect(useSettingsStore.getState().smtpTestError).toBe('Connection failed');
    });

    it('should set testing status while in progress', async () => {
      vi.mocked(fetch).mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              json: () => Promise.resolve({ success: true }),
            } as Response);
          }, 100);
        })
      );

      const promise = useSettingsStore.getState().testSmtpConnection();
      expect(useSettingsStore.getState().smtpTestStatus).toBe('testing');
      await promise;
    });

    it('should send SMTP config in request body', async () => {
      useSettingsStore.getState().updateSmtp({
        username: 'testuser',
        host: 'smtp.test.com',
      });
      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await useSettingsStore.getState().testSmtpConnection();

      expect(fetch).toHaveBeenCalledWith(
        '/api/smtp/test',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('testuser'),
        })
      );
    });
  });

  describe('Sending Settings', () => {
    it('should update sending settings', () => {
      useSettingsStore.getState().updateSending({
        batchSize: 100,
        maxPerHour: 1000,
      });

      const { sending } = useSettingsStore.getState();
      expect(sending.batchSize).toBe(100);
      expect(sending.maxPerHour).toBe(1000);
    });

    it('should update tracking settings', () => {
      useSettingsStore.getState().updateSending({
        trackOpens: false,
        trackClicks: false,
      });

      const { sending } = useSettingsStore.getState();
      expect(sending.trackOpens).toBe(false);
      expect(sending.trackClicks).toBe(false);
    });
  });

  describe('Appearance Settings', () => {
    it('should set theme to light', () => {
      useSettingsStore.getState().setTheme('light');
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('should set theme to dark', () => {
      useSettingsStore.getState().setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('should set theme to system', () => {
      useSettingsStore.getState().setTheme('system');
      expect(useSettingsStore.getState().theme).toBe('system');
    });

    it('should set language to English', () => {
      useSettingsStore.getState().setLanguage('en');
      expect(useSettingsStore.getState().language).toBe('en');
    });

    it('should set language to Arabic', () => {
      useSettingsStore.getState().setLanguage('ar');
      expect(useSettingsStore.getState().language).toBe('ar');
    });
  });

  describe('Reset Settings', () => {
    it('should reset all settings to defaults', () => {
      // Modify settings
      useSettingsStore.getState().updateSmtp({
        username: 'test@example.com',
        password: 'secret',
      });
      useSettingsStore.getState().updateSending({ batchSize: 100 });
      useSettingsStore.getState().setTheme('dark');
      useSettingsStore.setState({ smtpTestStatus: 'success' });

      // Reset
      useSettingsStore.getState().resetSettings();

      const state = useSettingsStore.getState();
      expect(state.smtp.username).toBe('');
      expect(state.smtp.password).toBe('');
      expect(state.sending.batchSize).toBe(50);
      expect(state.theme).toBe('system');
      expect(state.smtpTestStatus).toBe('idle');
      expect(state.smtpTestError).toBeNull();
    });
  });
});
