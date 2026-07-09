/**
 * NestJS Unit Test Setup Utilities
 * Provides utilities for setting up NestJS testing modules for unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { setupTestDB, cleanupTestDB, closeTestDB } from './setup';
import { DatabaseModule } from '../src/infrastructure/database/database.module';
import { CommonModule } from '../src/common/common.module';

/**
 * Create a NestJS testing module for unit tests
 * @param imports - Module imports (e.g., UserModule, ProjectModule)
 * @param providers - Additional providers to include
 */
export async function createNestTestingModule(
  imports: any[] = [],
  providers: any[] = []
): Promise<TestingModule> {
  await setupTestDB();

  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      DatabaseModule,
      CommonModule,
      ...imports,
    ],
    providers: [
      ...providers,
    ],
  })
    .compile();
}

/**
 * Cleanup test database (call before/after each test)
 */
export async function cleanupNestUnitDB(): Promise<void> {
  await cleanupTestDB();
}

/**
 * Close test database connection
 */
export async function closeNestUnitDB(): Promise<void> {
  await closeTestDB();
}
