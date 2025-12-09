import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface SmtpPreset {
  host: string;
  port: number;
  secure: boolean;
}

export interface EmailOptions {
  from: string;
  fromName?: string;
  to: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailSender {
  send: (options: EmailOptions) => Promise<SendResult>;
  verify: () => Promise<boolean>;
}

const SMTP_PRESETS: Record<string, SmtpPreset> = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
  },
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
  },
  mailgun: {
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
  },
  ses: {
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
  },
  zoho: {
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
  },
};

/**
 * Get SMTP preset configuration for common providers
 */
export function getSmtpPreset(provider: string): SmtpPreset {
  const preset = SMTP_PRESETS[provider.toLowerCase()];
  if (!preset) {
    throw new Error(`Unknown SMTP provider: ${provider}`);
  }
  return preset;
}

/**
 * Get all available SMTP providers
 */
export function getAvailableProviders(): string[] {
  return Object.keys(SMTP_PRESETS);
}

/**
 * Create an email sender instance with the given SMTP configuration
 */
export function createEmailSender(config: SmtpConfig): EmailSender {
  const transporter: Transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return {
    async send(options: EmailOptions): Promise<SendResult> {
      try {
        const from = options.fromName
          ? `"${options.fromName}" <${options.from}>`
          : options.from;

        const mailOptions = {
          from,
          to: options.to,
          replyTo: options.replyTo,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments,
        };

        const info = await transporter.sendMail(mailOptions);

        return {
          success: true,
          messageId: info.messageId,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    async verify(): Promise<boolean> {
      try {
        await transporter.verify();
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Build SMTP config from preset provider
 */
export function buildSmtpConfig(
  provider: string,
  username: string,
  password: string
): SmtpConfig {
  const preset = getSmtpPreset(provider);
  return {
    ...preset,
    auth: {
      user: username,
      pass: password,
    },
  };
}

/**
 * Build custom SMTP config
 */
export function buildCustomSmtpConfig(
  host: string,
  port: number,
  secure: boolean,
  username: string,
  password: string
): SmtpConfig {
  return {
    host,
    port,
    secure,
    auth: {
      user: username,
      pass: password,
    },
  };
}
