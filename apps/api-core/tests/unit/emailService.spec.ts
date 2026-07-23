/**
 * MailService Unit Tests (NestJS)
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MailService } from '../../src/infrastructure/mail/mail.service';
import { LoggerService } from '../../src/infrastructure/logger/logger.service';
import { SanitizeService } from '../../src/common/sanitize/sanitize.service';

describe('MailService (NestJS)', () => {
  let module: TestingModule;
  let mailService: MailService;
  let loggerMock: { log: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; debug: ReturnType<typeof vi.fn> };
  let sanitizeMock: { escapeHtml: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    loggerMock = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    sanitizeMock = {
      escapeHtml: vi.fn((s) => s),
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        MailService,
        { provide: LoggerService, useValue: loggerMock },
        { provide: SanitizeService, useValue: sanitizeMock },
      ],
    }).compile();

    mailService = module.get<MailService>(MailService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendEmail', () => {
    it('should log email information when SMTP is not configured', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await mailService.sendEmail(options);

      expect(loggerMock.log).toHaveBeenCalled();
    });

    it('should handle email with text content', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      await expect(mailService.sendEmail(options)).resolves.not.toThrow();
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

      await expect(mailService.sendEmail(options)).resolves.not.toThrow();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      await expect(
        mailService.sendPasswordResetEmail(
          { email: 'test@example.com' },
          'https://example.com/reset?token=reset-token-123',
        ),
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

      await expect(mailService.sendContactNotificationToAdmin(contactData)).resolves.not.toThrow();
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

      await expect(mailService.sendContactConfirmationToUser(contactData)).resolves.not.toThrow();
    });
  });
});
