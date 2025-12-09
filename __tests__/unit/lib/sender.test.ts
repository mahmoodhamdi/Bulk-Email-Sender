import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEmailSender,
  getSmtpPreset,
  getAvailableProviders,
  buildSmtpConfig,
  buildCustomSmtpConfig,
  type SmtpConfig,
} from '@/lib/email/sender';

// Create shared mock functions that persist across imports
const mockSendMail = vi.fn();
const mockVerify = vi.fn();

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: mockVerify,
    })),
  },
  createTransport: vi.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

describe('Email Sender', () => {
  const mockConfig: SmtpConfig = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'password123',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-123' });
    mockVerify.mockResolvedValue(true);
  });

  describe('createEmailSender', () => {
    it('should create an email sender instance', () => {
      const sender = createEmailSender(mockConfig);
      expect(sender).toBeDefined();
      expect(typeof sender.send).toBe('function');
      expect(typeof sender.verify).toBe('function');
    });
  });

  describe('send', () => {
    it('should send an email successfully', async () => {
      const sender = createEmailSender(mockConfig);
      const result = await sender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should include from name when provided', async () => {
      const sender = createEmailSender(mockConfig);
      const result = await sender.send({
        from: 'sender@example.com',
        fromName: 'Test Sender',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
      expect(result.success).toBe(true);
    });

    it('should support plain text emails', async () => {
      const sender = createEmailSender(mockConfig);
      const result = await sender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text content',
      });
      expect(result.success).toBe(true);
    });

    it('should support attachments', async () => {
      const sender = createEmailSender(mockConfig);
      const result = await sender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        attachments: [{ filename: 'test.txt', content: 'Test content' }],
      });
      expect(result.success).toBe(true);
    });

    it('should include reply-to when provided', async () => {
      const sender = createEmailSender(mockConfig);
      const result = await sender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        replyTo: 'replies@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
      expect(result.success).toBe(true);
    });

    it('should handle send error', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));
      const sender = createEmailSender(mockConfig);
      const result = await sender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockSendMail.mockRejectedValue('String error');
      const sender = createEmailSender(mockConfig);
      const result = await sender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('verify', () => {
    it('should verify SMTP connection', async () => {
      const sender = createEmailSender(mockConfig);
      const isValid = await sender.verify();
      expect(isValid).toBe(true);
    });

    it('should return false on verify failure', async () => {
      mockVerify.mockRejectedValue(new Error('Connection failed'));
      const sender = createEmailSender(mockConfig);
      const isValid = await sender.verify();
      expect(isValid).toBe(false);
    });
  });

  describe('getSmtpPreset', () => {
    it('should have Gmail preset', () => {
      const preset = getSmtpPreset('gmail');
      expect(preset.host).toBe('smtp.gmail.com');
      expect(preset.port).toBe(587);
      expect(preset.secure).toBe(false);
    });

    it('should have SendGrid preset', () => {
      const preset = getSmtpPreset('sendgrid');
      expect(preset.host).toBe('smtp.sendgrid.net');
      expect(preset.port).toBe(587);
    });

    it('should have Mailgun preset', () => {
      const preset = getSmtpPreset('mailgun');
      expect(preset.host).toBe('smtp.mailgun.org');
    });

    it('should have Outlook preset', () => {
      const preset = getSmtpPreset('outlook');
      expect(preset.host).toBe('smtp-mail.outlook.com');
      expect(preset.port).toBe(587);
    });

    it('should have Yahoo preset', () => {
      const preset = getSmtpPreset('yahoo');
      expect(preset.host).toBe('smtp.mail.yahoo.com');
    });

    it('should have SES preset', () => {
      const preset = getSmtpPreset('ses');
      expect(preset.host).toBe('email-smtp.us-east-1.amazonaws.com');
    });

    it('should have Zoho preset', () => {
      const preset = getSmtpPreset('zoho');
      expect(preset.host).toBe('smtp.zoho.com');
    });

    it('should be case-insensitive', () => {
      const preset = getSmtpPreset('GMAIL');
      expect(preset.host).toBe('smtp.gmail.com');
    });

    it('should throw error for unknown provider', () => {
      expect(() => getSmtpPreset('unknown')).toThrow('Unknown SMTP provider: unknown');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return all available providers', () => {
      const providers = getAvailableProviders();
      expect(providers).toContain('gmail');
      expect(providers).toContain('outlook');
      expect(providers).toContain('yahoo');
      expect(providers).toContain('sendgrid');
      expect(providers).toContain('mailgun');
      expect(providers).toContain('ses');
      expect(providers).toContain('zoho');
    });

    it('should return 7 providers', () => {
      const providers = getAvailableProviders();
      expect(providers.length).toBe(7);
    });

    it('should return array of strings', () => {
      const providers = getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      providers.forEach((p) => expect(typeof p).toBe('string'));
    });
  });

  describe('buildSmtpConfig', () => {
    it('should build config from preset', () => {
      const config = buildSmtpConfig('gmail', 'user@gmail.com', 'password123');
      expect(config.host).toBe('smtp.gmail.com');
      expect(config.port).toBe(587);
      expect(config.secure).toBe(false);
      expect(config.auth.user).toBe('user@gmail.com');
      expect(config.auth.pass).toBe('password123');
    });

    it('should build SendGrid config', () => {
      const config = buildSmtpConfig('sendgrid', 'apikey', 'SG.xxx');
      expect(config.host).toBe('smtp.sendgrid.net');
      expect(config.auth.user).toBe('apikey');
      expect(config.auth.pass).toBe('SG.xxx');
    });

    it('should throw for unknown provider', () => {
      expect(() => buildSmtpConfig('invalid', 'user', 'pass')).toThrow(
        'Unknown SMTP provider: invalid'
      );
    });
  });

  describe('buildCustomSmtpConfig', () => {
    it('should build custom SMTP config', () => {
      const config = buildCustomSmtpConfig(
        'mail.example.com',
        465,
        true,
        'admin@example.com',
        'secret'
      );
      expect(config.host).toBe('mail.example.com');
      expect(config.port).toBe(465);
      expect(config.secure).toBe(true);
      expect(config.auth.user).toBe('admin@example.com');
      expect(config.auth.pass).toBe('secret');
    });

    it('should build non-secure config', () => {
      const config = buildCustomSmtpConfig(
        'smtp.example.com',
        587,
        false,
        'user@example.com',
        'password'
      );
      expect(config.secure).toBe(false);
      expect(config.port).toBe(587);
    });
  });
});
