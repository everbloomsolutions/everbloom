import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from './cloudinary';
import { LoggerModule } from '../infrastructure/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
