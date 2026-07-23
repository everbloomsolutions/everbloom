/**
 * NestJS Unit Test Setup Utilities
 * Provides utilities for setting up NestJS testing modules for unit tests
 */

import './env-setup';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../src/infrastructure/database/database.module';
import { CommonModule } from '../src/common/common.module';
import { setupTestDB, cleanupTestDB, closeTestDB } from './setup';

const testMongodbUri =
  process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017/everbloom-test';

const testConfig = {
  nodeEnv: 'test',
  port: 8080,
  host: 'localhost',
  protocol: 'http',
  corsOrigin: '',
  logLevel: 'error',
  enableDebug: false,
  mongodbUri: testMongodbUri,
  redisUrl: process.env.REDIS_URL?.trim() || '',
  jwtSecret: process.env.JWT_SECRET?.trim() || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET?.trim() || '',
  jwtExpiresIn: '7d',
  jwtRefreshExpiresIn: '30d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY?.trim(),
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim(),
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY?.trim(),
  },
  adminPanelUrl: process.env.ADMIN_PANEL_URL?.trim() || 'http://localhost:3001',
  smtpHost: process.env.SMTP_HOST?.trim(),
  smtpPort: process.env.SMTP_PORT?.trim() || '587',
  smtpUser: process.env.SMTP_USER?.trim(),
  smtpPass: process.env.SMTP_PASS?.trim(),
  smtpFrom: process.env.SMTP_FROM?.trim(),
  dbPingTimeoutMs: 5000,
  dbReadyTimeoutMs: 0,
  dbCooldownMs: 0,
  dbStartupTimeoutMs: 15000,
  runtimePolicy: {
    platform: 'local',
    isProductionLike: false,
    isContainerized: false,
    defaultProtocol: 'http',
  },
  isVercel: false,
  isProduction: false,
  isContainerized: false,
  isDevelopment: true,
};

function getConfigValue(key: string): unknown {
  const parts = key.split('.');
  let value: unknown = testConfig;
  for (const part of parts) {
    if (value === null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

const configServiceMock = {
  get: <T = unknown>(key: string, defaultValue?: T): T | undefined => {
    const value = getConfigValue(key);
    return value !== undefined ? (value as T) : defaultValue;
  },
  getOrThrow: <T = unknown>(key: string): T => {
    const value = getConfigValue(key);
    if (value === undefined) {
      throw new Error(`Missing required config: ${key}`);
    }
    return value as T;
  },
};

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
    imports: [DatabaseModule, CommonModule, ...imports],
    providers: [...providers],
  })
    .overrideProvider(ConfigService)
    .useValue(configServiceMock)
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
