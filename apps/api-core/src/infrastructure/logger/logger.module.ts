import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Logger Module
 *
 * Global module providing LoggerService throughout the application.
 * Uses Global decorator so LoggerService can be injected anywhere without
 * importing the module.
 */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
