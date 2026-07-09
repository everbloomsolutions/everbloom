import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './cloudinary';
import { LoggerModule } from '../infrastructure/logger/logger.module';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
