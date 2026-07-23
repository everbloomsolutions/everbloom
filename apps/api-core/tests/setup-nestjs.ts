/**
 * NestJS Test Setup Utilities
 * Provides utilities for setting up NestJS testing modules
 */

import './env-setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { setupTestDB, cleanupTestDB, closeTestDB } from './setup';

let app: INestApplication;
let moduleFixture: TestingModule;

/**
 * Create a NestJS testing application
 */
export async function createNestApp(): Promise<INestApplication> {
  await setupTestDB();

  const { AppModule } = await import('../src/app.module');
  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  // Apply bootstrap, security, middleware configurations as in main.ts
  const { BootstrapService } = await import('../src/config/runtime/bootstrap.service');
  const { SecurityService } = await import('../src/config/runtime/security.service');
  const { MiddlewareService } = await import('../src/config/runtime/middleware.service');

  app.get(SecurityService).configure(app);
  app.get(MiddlewareService).configure(app);
  app.get(BootstrapService).configure(app);

  // Apply global pipes, filters, interceptors as in main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}

/**
 * Close the NestJS testing application
 */
export async function closeNestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
  if (moduleFixture) {
    await moduleFixture.close();
  }
  await closeTestDB();
}

/**
 * Get the NestJS application instance
 */
export function getNestApp(): INestApplication {
  return app;
}

/**
 * Cleanup test database (call before/after each test)
 */
export async function cleanupNestDB(): Promise<void> {
  await cleanupTestDB();
}
