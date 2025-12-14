import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { obfuscate, deobfuscate } from '@/lib/crypto';
import { CSRF_HEADER_NAME, CSRF_COOKIE_NAME } from '@/lib/csrf';

// Helper to get CSRF token from cookies
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return value;
    }
  }
  return null;
}

export interface SmtpConfig {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

// Internal interface for stored SMTP config with obfuscated password
interface StoredSmtpConfig extends Omit<SmtpConfig, 'password'> {
  _obfuscatedPassword?: string;
}

export interface SendingSettings {
  batchSize: number;
  delayBetweenBatches: number;
  maxPerHour: number;
  retryAttempts: number;
  trackOpens: boolean;
  trackClicks: boolean;
  addUnsubscribeLink: boolean;
}

interface SettingsStore {
  // SMTP
  smtp: SmtpConfig;
  smtpTestStatus: 'idle' | 'testing' | 'success' | 'failed';
  smtpTestError: string | null;

  // Sending
  sending: SendingSettings;

  // Appearance
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';

  // Actions
  updateSmtp: (data: Partial<SmtpConfig>) => void;
  setSmtpProvider: (provider: string) => void;
  testSmtpConnection: () => Promise<boolean>;
  updateSending: (data: Partial<SendingSettings>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'ar') => void;
  resetSettings: () => void;
}

const SMTP_PRESETS: Record<string, Partial<SmtpConfig>> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false },
  mailgun: { host: 'smtp.mailgun.org', port: 587, secure: false },
  ses: { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false },
  zoho: { host: 'smtp.zoho.com', port: 587, secure: false },
  custom: { host: '', port: 587, secure: false },
};

const initialSmtp: SmtpConfig = {
  provider: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromEmail: '',
  fromName: '',
};

const initialSending: SendingSettings = {
  batchSize: 50,
  delayBetweenBatches: 2,
  maxPerHour: 500,
  retryAttempts: 3,
  trackOpens: true,
  trackClicks: true,
  addUnsubscribeLink: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      smtp: initialSmtp,
      smtpTestStatus: 'idle',
      smtpTestError: null,
      sending: initialSending,
      theme: 'system',
      language: 'en',

      updateSmtp: (data) => {
        set((state) => ({
          smtp: { ...state.smtp, ...data },
          smtpTestStatus: 'idle',
          smtpTestError: null,
        }));
      },

      setSmtpProvider: (provider) => {
        const preset = SMTP_PRESETS[provider];
        if (preset) {
          set((state) => ({
            smtp: {
              ...state.smtp,
              provider,
              ...preset,
            },
            smtpTestStatus: 'idle',
            smtpTestError: null,
          }));
        }
      },

      testSmtpConnection: async () => {
        set({ smtpTestStatus: 'testing', smtpTestError: null });

        try {
          const { smtp } = get();
          const csrfToken = getCsrfToken();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (csrfToken) {
            headers[CSRF_HEADER_NAME] = csrfToken;
          }

          const response = await fetch('/api/smtp/test', {
            method: 'POST',
            headers,
            body: JSON.stringify(smtp),
          });

          const data = await response.json();

          if (data.success) {
            set({ smtpTestStatus: 'success', smtpTestError: null });
            return true;
          } else {
            set({ smtpTestStatus: 'failed', smtpTestError: data.error });
            return false;
          }
        } catch (error) {
          set({
            smtpTestStatus: 'failed',
            smtpTestError: error instanceof Error ? error.message : 'Connection failed'
          });
          return false;
        }
      },

      updateSending: (data) => {
        set((state) => ({
          sending: { ...state.sending, ...data },
        }));
      },

      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            root.classList.add(systemTheme);
          } else {
            root.classList.add(theme);
          }
        }
      },

      setLanguage: (language) => {
        set({ language });
        // Redirect to change locale
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const newPath = currentPath.replace(/^\/(en|ar)/, `/${language}`);
          if (newPath !== currentPath) {
            window.location.href = newPath || `/${language}`;
          }
        }
      },

      resetSettings: () => {
        set({
          smtp: initialSmtp,
          sending: initialSending,
          theme: 'system',
          smtpTestStatus: 'idle',
          smtpTestError: null,
        });
      },
    }),
    {
      name: 'bulk-email-settings',
      partialize: (state) => {
        // Obfuscate password before storing
        const { password, ...smtpWithoutPassword } = state.smtp;
        const storedSmtp: StoredSmtpConfig = {
          ...smtpWithoutPassword,
          _obfuscatedPassword: password ? obfuscate(password) : undefined,
        };
        return {
          smtp: storedSmtp,
          sending: state.sending,
          theme: state.theme,
          language: state.language,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Deobfuscate password on load
          const storedSmtp = state.smtp as unknown as StoredSmtpConfig;
          if (storedSmtp._obfuscatedPassword) {
            state.smtp.password = deobfuscate(storedSmtp._obfuscatedPassword);
            delete (state.smtp as unknown as StoredSmtpConfig)._obfuscatedPassword;
          }
        }
      },
    }
  )
);
