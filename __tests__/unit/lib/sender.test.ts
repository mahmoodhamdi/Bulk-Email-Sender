import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmailSender, type SmtpConfig } from '@/lib/email/sender';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
      verify: vi.fn().mockResolvedValue(true),
    })),
  },
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
    verify: vi.fn().mockResolvedValue(true),
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
        attachments: [
          {
            filename: 'test.txt',
            content: 'Test content',
          },
        ],
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
  });

  describe('verify', () => {
    it('should verify SMTP connection', async () => {
      const sender = createEmailSender(mockConfig);
      const isValid = await sender.verify();
      expect(isValid).toBe(true);
    });
  });

  describe('SMTP presets', () => {
    it('should have Gmail preset', async () => {
      const { getSmtpPreset } = await import('@/lib/email/sender');
      const preset = getSmtpPreset('gmail');
      expect(preset.host).toBe('smtp.gmail.com');
      expect(preset.port).toBe(587);
    });

    it('should have SendGrid preset', async () => {
      const { getSmtpPreset } = await import('@/lib/email/sender');
      const preset = getSmtpPreset('sendgrid');
      expect(preset.host).toBe('smtp.sendgrid.net');
    });

    it('should have Mailgun preset', async () => {
      const { getSmtpPreset } = await import('@/lib/email/sender');
      const preset = getSmtpPreset('mailgun');
      expect(preset.host).toBe('smtp.mailgun.org');
    });
  });
});
