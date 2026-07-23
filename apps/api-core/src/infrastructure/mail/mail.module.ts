import { Module, Global } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
