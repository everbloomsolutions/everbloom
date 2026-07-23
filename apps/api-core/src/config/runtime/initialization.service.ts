import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { CloudinaryService } from '../cloudinary';

/**
 * Initialization Service
 * 
 * Implements the Lifecycle Hook Pattern (OnModuleInit).
 * Handles application-level initialization tasks.
 * 
 * Responsibilities:
 * - Initialize third-party services (Cloudinary)
 * - Perform startup initialization tasks
 */
@Injectable()
export class InitializationService implements OnModuleInit {
  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(CloudinaryService) private readonly cloudinaryService: CloudinaryService,
  ) {
    this.logger.setContext('InitializationService');
  }

  /**
   * Lifecycle hook: Called once the module has been initialized
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing application services...');
    
    try {
      // Cloudinary is initialized via its own OnModuleInit hook
      // Just verify it's ready
      if (this.cloudinaryService.isCloudinaryInitialized()) {
        this.logger.log('Cloudinary initialization completed');
      } else {
        this.logger.warn('Cloudinary not initialized - image uploads will be disabled');
      }
    } catch (error) {
      this.logger.error('Failed to verify Cloudinary initialization', String(error), 'InitializationService');
      // Don't throw - allow app to start even if Cloudinary fails
      // Image uploads will fail gracefully with appropriate error messages
    }

    this.logger.log('Application initialization completed');
  }
}
