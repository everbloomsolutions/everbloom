/**
 * Test environment defaults.
 *
 * This module is imported before any code that reads process.env so that
 * unit/integration tests have sensible defaults. It must be imported before
 * the configuration module is loaded.
 */

// Load reflect-metadata before any decorator-evaluated code runs
import 'reflect-metadata';

// Force development environment to disable production-only middleware (HTTPS enforcement)
process.env.NODE_ENV = 'development';

process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI?.trim() ||
  process.env.MONGODB_URI?.trim() ||
  'mongodb://localhost:27017/everbloom-test';

process.env.JWT_SECRET =
  process.env.JWT_SECRET?.trim() ||
  'test-jwt-secret-must-be-at-least-32-characters-long-for-security';

process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET?.trim() ||
  'test-jwt-refresh-secret-must-be-at-least-32-characters-long';

// Explicitly disable Redis for unit/integration tests
process.env.REDIS_URL = process.env.REDIS_URL ?? '';

// Use no-op WebSocket gateway in tests to avoid Socket.IO overhead
process.env.DISABLE_WEBSOCKET = process.env.DISABLE_WEBSOCKET ?? '1';
