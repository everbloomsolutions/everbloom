/**
 * NestJS Test Setup Utilities
 * Provides utilities for setting up NestJS testing modules
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { setupTestDB, cleanupTestDB, closeTestDB } from './setup';

let app: INestApplication;
let moduleFixture: TestingModule;

/**
 * Create a NestJS testing application
 */
export async function createNestApp(): Promise<INestApplication> {
  await setupTestDB();

  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

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
