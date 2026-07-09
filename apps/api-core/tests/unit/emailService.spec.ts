/**
 * EmailService Unit Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../../src/infrastructure/mail/mail.service';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Mock Logger
vi.mock('@nestjs/common', async () => {
  const actual = await vi.importActual('@nestjs/common');
  return {
    ...actual,
    Logger: vi.fn().mockImplementation(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  };
});

describe('EmailService (NestJS)', () => {
  let module: TestingModule;
  let emailService: EmailService;
  let logger: Logger;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [EmailService],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    logger = new Logger('EmailService');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('sendEmail', () => {
    it('should log email information', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await emailService.sendEmail(options);

      // In test environment, email service logs instead of sending
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle email with text content', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      await expect(emailService.sendEmail(options)).resolves.not.toThrow();
    });

    it('should handle email with attachments', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        attachments: [
          {
            filename: 'test.pdf',
            path: '/path/to/test.pdf',
          },
        ],
      };

      await expect(emailService.sendEmail(options)).resolves.not.toThrow();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      await expect(
        emailService.sendPasswordResetEmail('test@example.com', 'reset-token-123')
      ).resolves.not.toThrow();
    });
  });

  describe('sendContactNotificationToAdmin', () => {
    it('should send contact notification to admin', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message',
      };

      await expect(
        emailService.sendContactNotificationToAdmin(contactData)
      ).resolves.not.toThrow();
    });
  });

  describe('sendContactConfirmationToUser', () => {
    it('should send contact confirmation to user', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message',
      };

      await expect(
        emailService.sendContactConfirmationToUser(contactData)
      ).resolves.not.toThrow();
    });
  });
});
