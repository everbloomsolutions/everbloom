import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerService } from '../logger/logger.service';
import { SanitizeService } from '../../common/sanitize/sanitize.service';
import { brandConfig } from '../../config/brand';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
    private sanitizeService: SanitizeService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('smtpHost');
    const smtpPort = this.configService.get<string>('smtpPort', '587');
    const smtpUser = this.configService.get<string>('smtpUser');
    const smtpPass = this.configService.get<string>('smtpPass');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.transporter = null;
      return;
    }

    const portNum = parseInt(smtpPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      this.logger.warn(`Invalid SMTP_PORT: ${smtpPort}, using default 587`);
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: portNum,
        secure: portNum === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: this.configService.get<string>('nodeEnv') === 'production',
        },
      });
    } catch (error) {
      this.logger.error('Failed to create email transporter:', error instanceof Error ? error.message : String(error));
      this.transporter = null;
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const fromEmail =
      this.configService.get<string>('smtpFrom') ||
      this.configService.get<string>('smtpUser') ||
      'noreply@example.com';

    if (!this.transporter) {
      this.logger.log('Email would be sent (SMTP not configured)', {
        to: options.to,
        subject: options.subject,
        from: fromEmail,
      });
      this.logger.debug('Email content:', {
        html: options.html.substring(0, 200) + '...',
        text: options.text?.substring(0, 200) + '...',
      });

      if (options.subject.includes('Password Reset') || options.subject.includes('Reset Your')) {
        const urlMatch = options.html.match(/href="([^"]+)"/);
        if (urlMatch) {
          this.logger.log('Password reset URL (for testing):', urlMatch[1]);
        }
      }
      return;
    }

    try {
      const mailOptions = {
        from: `"${brandConfig.name}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log('Email sent successfully', { to: options.to, subject: options.subject });
    } catch (error) {
      this.logger.error('Failed to send email:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async sendPasswordResetEmail(
    user: { email: string; name?: string },
    resetUrl: string,
  ): Promise<void> {
    const safeName = this.sanitizeService.escapeHtml(user.name || 'there');

    const subject = `Reset Your ${brandConfig.name} Password`;
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${brandConfig.colors.primary.DEFAULT}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${brandConfig.name}</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${brandConfig.colors.primary.DEFAULT}; margin-top: 0;">Password Reset Request</h2>
          <p>Hi ${safeName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: ${brandConfig.colors.primary.DEFAULT}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: ${brandConfig.colors.primary.DEFAULT}; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            <strong>This link will expire in 1 hour.</strong><br>
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">This is an automated email from ${brandConfig.name}</p>
          <p style="margin: 5px 0 0 0;">${brandConfig.contact.email}</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendPasswordResetConfirmationEmail(
    user: { email: string; name?: string },
  ): Promise<void> {
    const safeName = this.sanitizeService.escapeHtml(user.name || 'there');

    const subject = `Password Reset Successful - ${brandConfig.name}`;
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${brandConfig.colors.primary.DEFAULT}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${brandConfig.name}</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${brandConfig.colors.primary.DEFAULT}; margin-top: 0;">Password Reset Successful</h2>
          <p>Hi ${safeName},</p>
          <p>Your password has been successfully reset. If you didn't make this change, please contact us immediately.</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Security Tip:</strong> If you didn't request this password reset, please contact our support team immediately.
            </p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">This is an automated email from ${brandConfig.name}</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendContactNotificationToAdmin(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const adminEmail = this.configService.get<string>('adminPanelUrl')?.replace(/^https?:\/\//, '').split('/')[0] || 'admin@example.com';
    const safeName = this.sanitizeService.escapeHtml(data.name);
    const safeEmail = this.sanitizeService.escapeHtml(data.email);
    const safeSubject = this.sanitizeService.escapeHtml(data.subject);
    const safeMessage = this.sanitizeService.escapeHtml(data.message).replace(/\n/g, '<br>');

    const subject = `New Contact Form Submission: ${safeSubject}`;
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${brandConfig.colors.primary.DEFAULT}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${brandConfig.name}</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${brandConfig.colors.primary.DEFAULT}; margin-top: 0;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong></p>
          <p style="background-color: white; padding: 15px; border-radius: 4px; border-left: 3px solid ${brandConfig.colors.primary.DEFAULT};">
            ${safeMessage}
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">This is an automated notification from ${brandConfig.name}</p>
          <p style="margin: 5px 0 0 0;">${brandConfig.contact.email}</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: adminEmail,
      subject,
      html,
    });
  }

  async sendContactConfirmationToUser(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const safeName = this.sanitizeService.escapeHtml(data.name);
    const safeSubject = this.sanitizeService.escapeHtml(data.subject);
    const safeMessage = this.sanitizeService.escapeHtml(data.message).replace(/\n/g, '<br>');

    const subject = `Thank you for contacting ${brandConfig.name} - ${safeSubject}`;
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${brandConfig.colors.primary.DEFAULT}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${brandConfig.name}</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${brandConfig.colors.primary.DEFAULT}; margin-top: 0;">Thank you for contacting us!</h2>
          <p>Hi ${safeName},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 3px solid ${brandConfig.colors.primary.DEFAULT};">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: ${brandConfig.colors.primary.DEFAULT};"><strong>Your message:</strong></p>
            <p style="margin: 0;">${safeMessage}</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #374151;">Best regards,<br><strong>The ${brandConfig.name} Team</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
            ${brandConfig.contact.email} | ${brandConfig.contact.website}
          </p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: data.email,
      subject,
      html,
    });
  }

  async sendWelcomeEmail(
    user: { email: string; name?: string; password?: string; role: string }
  ): Promise<void> {
    const safeName = this.sanitizeService.escapeHtml(user.name || user.email.split('@')[0]);
    const adminPanelUrl =
      this.configService.get<string>('adminPanelUrl') ||
      (process.env.NODE_ENV !== 'production' && !process.env.VERCEL ? 'http://localhost:3001' : '');

    const subject = `Welcome to ${brandConfig.name} - Your Account Has Been Created`;
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${brandConfig.colors.primary.DEFAULT}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${brandConfig.name}</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${brandConfig.colors.primary.DEFAULT}; margin-top: 0;">Welcome to ${brandConfig.name}!</h2>
          <p>Hi ${safeName},</p>
          <p>Your account has been created successfully. You can now access the admin panel with the following credentials:</p>
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${brandConfig.colors.primary.DEFAULT};">
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${this.sanitizeService.escapeHtml(user.email)}</p>
            <p style="margin: 0 0 10px 0;"><strong>Role:</strong> ${this.sanitizeService.escapeHtml(user.role.charAt(0).toUpperCase() + user.role.slice(1))}</p>
            ${user.password ? `<p style="margin: 0;"><strong>Password:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${this.sanitizeService.escapeHtml(user.password)}</code></p>` : ''}
          </div>
          ${user.password ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Important:</strong> Please change your password after your first login for security purposes.
            </p>
          </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminPanelUrl}/login" style="background-color: ${brandConfig.colors.primary.DEFAULT}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Login to Admin Panel
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            If you have any questions or need assistance, please don't hesitate to contact our support team.
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">This is an automated email from ${brandConfig.name}</p>
          <p style="margin: 5px 0 0 0;">${brandConfig.contact.email}</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }
}
