import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../../logger/logger.service';
import { MailService } from '../../mail/mail.service';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Processor('email')
export class EmailProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly mailService: MailService,
  ) {
    this.logger.setContext('EmailProcessor');
  }

  @Process()
  async handleEmail(job: Job<EmailJobData>): Promise<{ success: boolean }> {
    const { to, subject, html, text } = job.data;

    this.logger.log(`Processing email job ${job.id} to ${to}`);

    try {
      await this.mailService.sendEmail({
        to,
        subject,
        html,
        text,
      });

      this.logger.log(`Email sent successfully to ${to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<EmailJobData>) {
    this.logger.log(`Email job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job<EmailJobData> | undefined, err: Error) {
    this.logger.error(`Email job ${job?.id} failed:`, err.message);
  }
}
