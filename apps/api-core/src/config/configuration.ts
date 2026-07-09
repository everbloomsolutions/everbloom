import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { detectRuntimePlatform, getRuntimePolicy, normalizeUrl } from './url-normalization';

// Load environment variables manually before NestJS ConfigModule
// Skip .env in production/Railway/Vercel - use platform environment variables only
const cwd = process.cwd();
const nodeEnv = process.env.NODE_ENV || 'development';
const runtimePlatform = detectRuntimePlatform();
const isVercel = runtimePlatform === 'vercel';
const isRailway = runtimePlatform === 'railway';
const isProduction = nodeEnv === 'production' || isVercel;

// Only load .env files in development and when not on Railway/Vercel
if (!isProduction && !isRailway && !isVercel) {
  // In monorepo, cwd may be apps/api-core; load root .env first so MONGODB_URI etc. are available
  const maybeRoot = path.resolve(cwd, '../..');
  const isMonorepoApp = path.basename(cwd) === 'api-core' && path.basename(path.dirname(cwd)) === 'apps';
  if (isMonorepoApp && maybeRoot !== cwd) {
    dotenv.config({ path: path.join(maybeRoot, '.env'), override: false });
    dotenv.config({ path: path.join(maybeRoot, '.env.local'), override: false });
    dotenv.config({ path: path.join(maybeRoot, '.env.development'), override: false });
  }
  const backendEnvDevPath = path.resolve(cwd, '.env.development');
  const backendEnvPath = path.resolve(cwd, '.env');
  const backendEnvLocalPath = path.resolve(cwd, '.env.local');
  dotenv.config({ path: backendEnvDevPath, override: false });
  dotenv.config({ path: backendEnvPath, override: false });
  dotenv.config({ path: backendEnvLocalPath, override: false });
}

export const configuration = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Vercel serverless: require env vars, no localhost defaults
  const runtimePlatform = detectRuntimePlatform();
  const isVercel = runtimePlatform === 'vercel';

  // Detect Railway environment - Railway sets PORT automatically
  const isRailway = runtimePlatform === 'railway';

  const runtimePolicy = getRuntimePolicy(nodeEnv);

  // Detect if running in a containerized environment (Docker/Kubernetes/Railway)
  // Centralized in RuntimePolicy to avoid logic drift.
  const isContainerized = runtimePolicy.isContainerized;
  const port = parseInt(process.env.PORT || process.env.BACKEND_PORT || '8080', 10);
  const host =
    process.env.PORT || process.env.RAILWAY || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL
      ? '0.0.0.0'
      : process.env.BACKEND_HOST || process.env.HOST || 'localhost';
  const protocol = isProduction || isVercel ? 'https' : 'http';
  const logLevel = process.env.LOG_LEVEL || (isProduction || isVercel ? 'info' : 'debug');
  const enableDebug = process.env.ENABLE_DEBUG === 'true' || (!isProduction && !isVercel);
  // Admin panel URL: required in production/Vercel via ADMIN_PANEL_URL; dev default only when not production
  const adminPanelUrl = normalizeUrl(
    process.env.ADMIN_PANEL_URL || (isProduction || isVercel ? '' : 'http://localhost:3001'),
    isProduction || isVercel ? 'https' : 'http',
  );
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  // MongoDB URI - required, but allow empty in production for validation to catch it
  // In production/Railway/containerized environments, MONGODB_URI must be set as environment variable
  // NEVER use localhost defaults in containerized environments (Docker/Railway/Kubernetes)

  const isDevLog = nodeEnv === 'development' && !isVercel;
  if (isDevLog) {
    console.log('[Config] Environment detection:', {
      nodeEnv,
      isProduction,
      isVercel,
      isRailway,
      isContainerized,
      cwd: process.cwd(),
      hasMongoEnvVar: !!process.env.MONGODB_URI,
      mongoEnvVarLength: process.env.MONGODB_URI?.length || 0,
      port: process.env.PORT,
      railway: process.env.RAILWAY,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT,
    });
  }

  // Default MongoDB URI based on environment
  // NEVER use localhost in production/Vercel/Railway/containerized - require MONGODB_URI
  let defaultMongoUri = '';
  if (!isProduction && !isVercel && !isRailway && !isContainerized) {
    defaultMongoUri = 'mongodb://localhost:27017/everbloom';
  } else if (isContainerized && !isProduction && !isVercel && !isRailway) {
    // Docker Compose development - use service name (matches MONGO_INITDB_DATABASE in docker-compose.dev.yaml)
    defaultMongoUri = 'mongodb://mongo:27017/everbloom';
  }
  // For production/Railway/containerized: defaultMongoUri remains empty (requires explicit MONGODB_URI)

  // In production/Railway/containerized: ALWAYS use process.env directly
  // This bypasses any .env file loading issues
  // In development: allow fallback to defaultMongoUri
  const rawMongoUri = process.env.MONGODB_URI;

  if (isDevLog) {
    console.log(`[Config] BEFORE processing - rawMongoUri: ${rawMongoUri ? `set (${rawMongoUri.length} chars, starts with: ${rawMongoUri.substring(0, 20)}...)` : 'NOT SET'}`);
    console.log(`[Config] Environment flags: isProduction=${isProduction}, isVercel=${isVercel}, isRailway=${isRailway}, isContainerized=${isContainerized}`);
  }

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

  // CRITICAL: In production/Vercel/Railway/containerized, require process.env.MONGODB_URI
  let mongodbUri: string;
  if (isProduction || isVercel || isRailway || isContainerized) {
    mongodbUri = rawMongoUri ? normalizeMongoUri(rawMongoUri) : '';
  } else {
    // Development: allow fallback to default
    mongodbUri = rawMongoUri ? normalizeMongoUri(rawMongoUri) : defaultMongoUri;
  }

  if (isDevLog && rawMongoUri && rawMongoUri !== mongodbUri) {
    console.log('[Config] Normalized MongoDB URI (fixed malformed query string)');
  }
  const maskedUri = mongodbUri
    ? mongodbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    : '(empty - will fail validation)';
  if (isDevLog) {
    console.log(`[Config] AFTER processing - mongodbUri: ${maskedUri}`);
    console.log(`[Config] mongodbUri length: ${mongodbUri.length}`);
    console.log(`[Config] Source: ${(isProduction || isVercel || isRailway || isContainerized) ? 'process.env (forced)' : 'process.env or default'}`);
  }

  if ((isProduction || isVercel || isRailway || isContainerized) && !mongodbUri) {
    console.error('[Config] MONGODB_URI is required. Set in Vercel Dashboard → Environment Variables (or Railway/env).');
  }

  // Redis URL - optional; in production/Vercel require REDIS_URL if app uses Redis
  const redisUrl =
    process.env.REDIS_URL ||
    (nodeEnv === 'production' || isVercel ? '' : 'redis://localhost:6379');

  // JWT secrets - required, but allow dev defaults (must be at least 32 chars)
  // Handle empty strings from env vars (treat as unset)
  // CRITICAL: In production/Railway, ALWAYS use process.env directly, never dev defaults
  const jwtSecretEnv = process.env.JWT_SECRET?.trim();
  const jwtRefreshSecretEnv = process.env.JWT_REFRESH_SECRET?.trim();

  // In production/Railway: use process.env directly, empty string if not set (validation will catch it)
  // In development: allow dev defaults
  let jwtSecret: string;
  let jwtRefreshSecret: string;

  if (isProduction || isVercel || isRailway || isContainerized) {
    jwtSecret = (jwtSecretEnv && jwtSecretEnv.length > 0) ? jwtSecretEnv : '';
    jwtRefreshSecret = (jwtRefreshSecretEnv && jwtRefreshSecretEnv.length > 0) ? jwtRefreshSecretEnv : '';
  } else {
    // Development: allow dev defaults
    jwtSecret = (jwtSecretEnv && jwtSecretEnv.length > 0)
      ? jwtSecretEnv
      : 'dev-secret-key-change-in-production-min-32-chars-long-enough';
    jwtRefreshSecret = (jwtRefreshSecretEnv && jwtRefreshSecretEnv.length > 0)
      ? jwtRefreshSecretEnv
      : 'dev-refresh-secret-key-change-in-production-min-32-chars-long-enough';
  }

  // Final values - use as-is (already handled above)
  const finalJwtSecret = jwtSecret;
  const finalJwtRefreshSecret = jwtRefreshSecret;

  // CRITICAL: Ensure mongodbUri is never empty in production/Railway if process.env.MONGODB_URI is set
  // NestJS ConfigModule may override this with environment variables, so we need to ensure
  // the value we return is correct and takes precedence
  // If process.env.MONGODB_URI is set but mongodbUri is empty, use the raw value
  let finalMongodbUri = mongodbUri;
  if ((isProduction || isVercel || isRailway || isContainerized) && !finalMongodbUri && rawMongoUri) {
    if (isDevLog) console.log('[Config] WARNING: mongodbUri is empty but process.env.MONGODB_URI is set. Using raw value.');
    finalMongodbUri = String(rawMongoUri).trim();
  }
  if (!finalMongodbUri && rawMongoUri) {
    if (isDevLog) console.log('[Config] CRITICAL: Using process.env.MONGODB_URI directly as last resort.');
    finalMongodbUri = String(rawMongoUri).trim();
  }
  if (isDevLog) {
    console.log(`[Config] Final mongodbUri to return: ${finalMongodbUri ? `${finalMongodbUri.length} chars` : 'EMPTY'}`);
  }

  const config = {
    nodeEnv: String(nodeEnv),
    port: Number(port),
    host: String(host),
    protocol: String(protocol),
    corsOrigin: process.env.BACKEND_CORS_ORIGIN || process.env.CORS_ORIGIN,
    logLevel: String(logLevel),
    enableDebug: Boolean(enableDebug),
    mongodbUri: String(finalMongodbUri), // Use final value - this MUST be set if process.env.MONGODB_URI is set
    redisUrl: String(redisUrl),
    jwtSecret: String(finalJwtSecret),
    jwtRefreshSecret: String(finalJwtRefreshSecret),
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
  };

  // Log what we're returning (masked) for debugging
  return config;
};
