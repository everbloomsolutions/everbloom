import dotenv from 'dotenv';
import path from 'path';
import { detectRuntimePlatform, getRuntimePolicy, normalizeUrl } from './url-normalization';

// Load environment variables manually before NestJS ConfigModule
// Skip .env in production/Vercel - use platform environment variables only
const cwd = process.cwd();
const nodeEnv = process.env.NODE_ENV || 'development';
const isVercel = !!process.env.VERCEL;
const isProduction = nodeEnv === 'production' || isVercel;

// Only load .env files in development and when not on Vercel
if (!isProduction && !isVercel) {
  // In monorepo, cwd may be apps/api-core; load root .env first so MONGODB_URI etc. are available
  const maybeRoot = path.resolve(cwd, '../..');
  const isMonorepoApp = path.basename(cwd) === 'api-core' && path.basename(path.dirname(cwd)) === 'apps';
  if (isMonorepoApp && maybeRoot !== cwd) {
    dotenv.config({ path: path.join(maybeRoot, '.env'), override: false });
    dotenv.config({ path: path.join(maybeRoot, '.env.local'), override: false });
    dotenv.config({ path: path.join(maybeRoot, '.env.development'), override: false });
    dotenv.config({ path: path.join(maybeRoot, '.env.development.local'), override: false });
  }
  const backendEnvDevPath = path.resolve(cwd, '.env.development');
  const backendEnvDevLocalPath = path.resolve(cwd, '.env.development.local');
  const backendEnvPath = path.resolve(cwd, '.env');
  const backendEnvLocalPath = path.resolve(cwd, '.env.local');
  dotenv.config({ path: backendEnvDevPath, override: false });
  dotenv.config({ path: backendEnvDevLocalPath, override: false });
  dotenv.config({ path: backendEnvPath, override: false });
  dotenv.config({ path: backendEnvLocalPath, override: false });
}

export const configuration = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const runtimeEnv = {
    VERCEL: process.env.VERCEL,
    KUBERNETES_SERVICE_HOST: process.env.KUBERNETES_SERVICE_HOST,
    IN_CONTAINER: process.env.IN_CONTAINER,
    DOCKER: process.env.DOCKER,
    IN_DOCKER: process.env.IN_DOCKER,
    NODE_ENV: process.env.NODE_ENV,
  };

  const runtimePolicy = getRuntimePolicy(nodeEnv, runtimeEnv);
  const isVercel = runtimePolicy.isVercel;
  const isProduction = runtimePolicy.isProductionLike;
  const isContainerized = runtimePolicy.isContainerized;
  const isDevelopment = !isProduction;

  const port = parseInt(process.env.PORT || process.env.BACKEND_PORT || '8080', 10);
  const host =
    process.env.PORT || isProduction
      ? '0.0.0.0'
      : process.env.BACKEND_HOST || process.env.HOST || 'localhost';
  const protocol = runtimePolicy.defaultProtocol;
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  const enableDebug = process.env.ENABLE_DEBUG === 'true' || isDevelopment;

  // Admin panel URL: required in production/Vercel/containerized environments;
  // non-containerized local dev may fall back to localhost.
  const adminPanelUrl = normalizeUrl(
    process.env.ADMIN_PANEL_URL || (isProduction || isVercel || isContainerized ? '' : 'http://localhost:3001'),
    isProduction || isVercel ? 'https' : 'http',
  );
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  // Default MongoDB URI based on environment
  // NEVER use localhost in production/Vercel/containerized - require MONGODB_URI
  let defaultMongoUri = '';
  if (!isProduction && !isVercel && !isContainerized) {
    defaultMongoUri = 'mongodb://localhost:27017/everbloom';
  } else if (isContainerized && !isProduction && !isVercel) {
    // Docker Compose development - use service name (matches MONGO_INITDB_DATABASE in docker-compose.dev.yaml)
    defaultMongoUri = 'mongodb://mongo:27017/everbloom';
  }

  // In production/Vercel/containerized: ALWAYS use process.env directly
  // This bypasses any .env file loading issues
  // In development: allow fallback to defaultMongoUri
  const rawMongoUri = process.env.MONGODB_URI;

  // Helper function to normalize MongoDB URI (fix malformed query strings)
  const normalizeMongoUri = (uri: string): string => {
    if (!uri) return uri;
    const trimmed = uri.trim();
    // Fix common issue: multiple ? in query string (should be &)
    // Pattern: ?param1=value1?param2=value2 should be ?param1=value1&param2=value2
    const questionMarkIndex = trimmed.indexOf('?');
    if (questionMarkIndex !== -1) {
      const beforeQuery = trimmed.substring(0, questionMarkIndex + 1);
      const queryString = trimmed.substring(questionMarkIndex + 1);
      // Replace all ? in query string with & (except the first one which is already part of beforeQuery)
      const normalizedQuery = queryString.replace(/\?/g, '&');
      return beforeQuery + normalizedQuery;
    }
    return trimmed;
  };

  // CRITICAL: In production/Vercel/containerized, require process.env.MONGODB_URI
  let mongodbUri: string;
  if (isProduction || isVercel || isContainerized) {
    mongodbUri = rawMongoUri ? normalizeMongoUri(rawMongoUri) : '';
  } else {
    // Development: allow fallback to default
    mongodbUri = rawMongoUri ? normalizeMongoUri(rawMongoUri) : defaultMongoUri;
  }

  // CRITICAL: Ensure mongodbUri is never empty in production/Vercel if process.env.MONGODB_URI is set
  // NestJS ConfigModule may override this with environment variables, so we need to ensure
  // the value we return is correct and takes precedence
  // If process.env.MONGODB_URI is set but mongodbUri is empty, use the raw value
  let finalMongodbUri = mongodbUri;
  if ((isProduction || isVercel || isContainerized) && !finalMongodbUri && rawMongoUri) {
    finalMongodbUri = String(rawMongoUri).trim();
  }
  if (!finalMongodbUri && rawMongoUri) {
    finalMongodbUri = String(rawMongoUri).trim();
  }

  // Default Redis URL based on environment
  let defaultRedisUrl = '';
  if (!isProduction && !isVercel && !isContainerized) {
    defaultRedisUrl = 'redis://localhost:6379';
  } else if (isContainerized && !isProduction && !isVercel) {
    // Docker Compose development - use service name
    defaultRedisUrl = 'redis://redis:6379';
  }

  // Honor an explicitly empty REDIS_URL (e.g. in tests) as a signal to disable Redis
  const redisUrl = process.env.REDIS_URL !== undefined ? process.env.REDIS_URL : defaultRedisUrl;

  // JWT secrets - required in all environments; no hardcoded dev defaults.
  // Use process.env directly and let validation enforce a minimum length.
  const jwtSecretEnv = process.env.JWT_SECRET?.trim();
  const jwtRefreshSecretEnv = process.env.JWT_REFRESH_SECRET?.trim();

  const jwtSecret = (jwtSecretEnv && jwtSecretEnv.length > 0) ? jwtSecretEnv : '';
  const jwtRefreshSecret = (jwtRefreshSecretEnv && jwtRefreshSecretEnv.length > 0) ? jwtRefreshSecretEnv : '';

  const config = {
    nodeEnv: String(nodeEnv),
    port: Number(port),
    host: String(host),
    protocol: String(protocol),
    corsOrigin:
      process.env.BACKEND_CORS_ORIGIN ||
      process.env.CORS_ORIGIN ||
      (isDevelopment && !isContainerized
        ? 'http://localhost:3000,http://localhost:3001'
        : ''),
    logLevel: String(logLevel),
    enableDebug: Boolean(enableDebug),
    dbPingTimeoutMs: parseInt(process.env.DB_PING_TIMEOUT_MS || '5000', 10),
    dbReadyTimeoutMs: parseInt(process.env.DB_READY_TIMEOUT_MS || '0', 10),
    dbCooldownMs: parseInt(process.env.DB_COOLDOWN_MS || '0', 10),
    dbStartupTimeoutMs: parseInt(process.env.DB_STARTUP_TIMEOUT_MS || '15000', 10),
    mongodbUri: String(finalMongodbUri),
    redisUrl: String(redisUrl),
    jwtSecret: String(jwtSecret),
    jwtRefreshSecret: String(jwtRefreshSecret),
    jwtExpiresIn: String(jwtExpiresIn),
    jwtRefreshExpiresIn: String(jwtRefreshExpiresIn),
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
    adminPanelUrl: String(adminPanelUrl),
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
    runtimePolicy,
    isVercel,
    isProduction,
    isContainerized,
    isDevelopment,
  };

  return config;
};
