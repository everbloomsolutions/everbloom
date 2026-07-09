import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { LoggerService } from '../infrastructure/logger/logger.service';

let cloudinaryServiceInstance: CloudinaryService | null = null;

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- singleton ref for legacy initializeCloudinary()
    cloudinaryServiceInstance = this;
  }

  async onModuleInit(): Promise<void> {
    this.initialize();
  }

  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      const cloudName = this.configService.get<string>('cloudinary.cloudName');
      const apiKey = this.configService.get<string>('cloudinary.apiKey');
      const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

      if (!cloudName || !apiKey || !apiSecret) {
        this.logger.warn('Cloudinary credentials not provided. Image uploads will be disabled.');
        return;
      }

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });

      this.isInitialized = true;
      this.logger.log('Cloudinary initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Cloudinary:', error instanceof Error ? error.message : String(error));
      this.isInitialized = false;
    }
  }

  getCloudinary(): typeof cloudinary | null {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.isInitialized ? cloudinary : null;
  }

  isCloudinaryInitialized(): boolean {
    return this.isInitialized;
  }
}

// Legacy function for backward compatibility (non-NestJS contexts)
export const initializeCloudinary = (): void => {
  if (cloudinaryServiceInstance) {
    cloudinaryServiceInstance.initialize();
  } else {
    // Fallback for non-NestJS contexts
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- sync bootstrap outside NestJS
    const logger = require('../infrastructure/logger').createLogger();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn('Cloudinary credentials not provided. Image uploads will be disabled.');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    logger.info('Cloudinary initialized successfully');
  }
};

export const getCloudinary = (): typeof cloudinary | null => {
  if (cloudinaryServiceInstance) {
    return cloudinaryServiceInstance.getCloudinary();
  }
  // Fallback for non-NestJS contexts
  initializeCloudinary();
  return cloudinary;
};

export const isCloudinaryInitialized = (): boolean => {
  if (cloudinaryServiceInstance) {
    return cloudinaryServiceInstance.isCloudinaryInitialized();
  }
  return false;
};
