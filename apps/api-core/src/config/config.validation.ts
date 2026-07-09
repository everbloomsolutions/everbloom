import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
  validateSync,
} from 'class-validator';

class CloudinaryConfig {
  @IsOptional()
  @IsString()
  cloudName?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiSecret?: string;
}

class GoogleMapsConfig {
  @IsOptional()
  @IsString()
  apiKey?: string;
}

class Config {
  @IsString()
  nodeEnv!: string;

  @IsNumber({}, { message: 'port must be a number' })
  @Min(1, { message: 'port must not be less than 1' })
  @Max(65535, { message: 'port must not be greater than 65535' })
  port!: number;

  @IsString({ message: 'host must be a string' })
  host!: string;

  @IsString({ message: 'protocol must be a string' })
  protocol!: string;

  @IsOptional()
  @IsString()
  corsOrigin?: string;

  @IsString({ message: 'logLevel must be a string' })
  logLevel!: string;

  @IsString({ message: 'mongodbUri must be a string' })
  mongodbUri!: string;

  @IsString({ message: 'redisUrl must be a string' })
  redisUrl!: string;

  @IsString({ message: 'jwtSecret must be a string' })
  jwtSecret!: string;

  @IsString({ message: 'jwtRefreshSecret must be a string' })
  jwtRefreshSecret!: string;

  @IsString({ message: 'jwtExpiresIn must be a string' })
  jwtExpiresIn!: string;

  @IsString({ message: 'jwtRefreshExpiresIn must be a string' })
  jwtRefreshExpiresIn!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  cloudinary?: CloudinaryConfig;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  googleMaps?: GoogleMapsConfig;

  @IsString({ message: 'adminPanelUrl must be a string' })
  adminPanelUrl!: string;
}

export function validateConfig(config: Record<string, unknown>) {
  // Config should already have proper values from configuration() function
  // Ensure all required fields exist and have correct types
  // Use process.env.NODE_ENV directly to avoid using wrong config.nodeEnv value
  // This ensures we use the actual environment, not a potentially wrong config value
  const actualNodeEnv = process.env.NODE_ENV || 'development';
  const actualIsProduction = actualNodeEnv === 'production' || !!process.env.VERCEL;

  const isDevLog = actualNodeEnv === 'development' && !process.env.VERCEL;
  if (isDevLog) {
    console.log('[Validation] Received config:', {
      hasMongodbUri: !!config.mongodbUri,
      mongodbUriType: typeof config.mongodbUri,
      mongodbUriLength: config.mongodbUri ? String(config.mongodbUri).length : 0,
      nodeEnv: config.nodeEnv,
      processEnvMongoUri: process.env.MONGODB_URI ? `set (${process.env.MONGODB_URI.length} chars)` : 'NOT SET',
    });
  }

  // CRITICAL: If config.mongodbUri is empty but process.env.MONGODB_URI is set,
  // use process.env.MONGODB_URI directly (NestJS ConfigModule may have overridden it)
  // This should work in ALL environments, not just production/Railway
  const rawMongoUri = process.env.MONGODB_URI;
  const configMongodbUri = config.mongodbUri ? String(config.mongodbUri).trim() : '';
  // Always use process.env.MONGODB_URI if config.mongodbUri is empty but env var is set
  const finalMongodbUri = (!configMongodbUri && rawMongoUri)
    ? String(rawMongoUri).trim() // Use process.env directly if config is empty but env var is set
    : configMongodbUri;

  if (isDevLog && !configMongodbUri && rawMongoUri) {
    console.log('[Validation] WARNING: config.mongodbUri is empty but process.env.MONGODB_URI is set. Using process.env directly.');
  }

  const configWithDefaults = {
    nodeEnv: config.nodeEnv ?? actualNodeEnv,
    port: config.port ?? 8080,
    host: config.host ?? 'localhost',
    protocol: config.protocol ?? 'http',
    logLevel: config.logLevel ?? 'info',
    // Use finalMongodbUri which may have been corrected from process.env
    mongodbUri: finalMongodbUri || (actualIsProduction ? '' : 'mongodb://localhost:27017/everbloom'),
    redisUrl: config.redisUrl ?? (actualIsProduction ? '' : 'redis://localhost:6379'),
    jwtSecret: config.jwtSecret ?? (actualIsProduction ? '' : 'dev-secret-key-change-in-production-min-32-chars-long-enough'),
    jwtRefreshSecret: config.jwtRefreshSecret ?? (actualIsProduction ? '' : 'dev-refresh-secret-key-change-in-production-min-32-chars-long-enough'),
    jwtExpiresIn: config.jwtExpiresIn ?? '7d',
    jwtRefreshExpiresIn: config.jwtRefreshExpiresIn ?? '30d',
    adminPanelUrl: config.adminPanelUrl ?? (actualIsProduction ? '' : 'http://localhost:3001'),
    corsOrigin: config.corsOrigin,
    cloudinary: config.cloudinary,
    googleMaps: config.googleMaps,
  };

  const validatedConfig = plainToInstance(Config, configWithDefaults, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    skipNullProperties: false,
    skipUndefinedProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = error.constraints || {};
      return Object.values(constraints).join(', ');
    });
    throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
  }

  // Additional validations after basic type checks (Vercel = production-like)
  const isProduction = validatedConfig.nodeEnv === 'production' || !!process.env.VERCEL;

  // MongoDB URI validation
  // Use the corrected value from configWithDefaults (which may have been fixed from process.env)
  let mongodbUri = validatedConfig.mongodbUri ? String(validatedConfig.mongodbUri).trim() : '';

  // CRITICAL FIX: If mongodbUri is empty but process.env.MONGODB_URI is set, use it directly
  // This handles the case where NestJS ConfigModule overrides the configuration function's return value
  if (!mongodbUri && process.env.MONGODB_URI) {
    const rawMongoUri = String(process.env.MONGODB_URI).trim();
    if (rawMongoUri) {
      if (isDevLog) console.log('[Validation] FIX: Using process.env.MONGODB_URI directly because config.mongodbUri is empty');
      mongodbUri = rawMongoUri;
      // Update validatedConfig so the value is available
      (validatedConfig as unknown as Record<string, unknown>).mongodbUri = mongodbUri;
    }
  }

  if (isProduction && mongodbUri.length === 0) {
    // Provide more detailed error message
    const actualEnvVar = process.env.MONGODB_URI;
    const envVarInfo = actualEnvVar
      ? `process.env.MONGODB_URI is set (length: ${actualEnvVar.length}) but config.mongodbUri is empty. This suggests .env files may be overriding it.`
      : 'process.env.MONGODB_URI is not set in the environment.';
    throw new Error(`MONGODB_URI is required in production/Vercel. ${envVarInfo} Set in Vercel Dashboard → Environment Variables or Railway.`);
  }
  if (mongodbUri.length > 0 && !/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Redis URL validation (optional, but if provided must be valid)
  const redisUrl = String(validatedConfig.redisUrl || '').trim();
  if (redisUrl.length > 0 && !/^redis(s)?:\/\//.test(redisUrl)) {
    throw new Error('REDIS_URL must be a valid Redis connection string');
  }

  // JWT Secret validation
  // CRITICAL: If config values contain dev defaults but process.env has correct values, use process.env
  let jwtSecret = validatedConfig.jwtSecret ? String(validatedConfig.jwtSecret).trim() : '';
  let jwtRefreshSecret = validatedConfig.jwtRefreshSecret ? String(validatedConfig.jwtRefreshSecret).trim() : '';

  // If config has dev default but process.env has a different value, use process.env
  const rawJwtSecret = process.env.JWT_SECRET?.trim() || '';
  const rawJwtRefreshSecret = process.env.JWT_REFRESH_SECRET?.trim() || '';

  if (isProduction) {
    if (jwtSecret.includes('dev-secret-key-change-in-production') && rawJwtSecret && !rawJwtSecret.includes('dev-secret-key-change-in-production')) {
      if (isDevLog) console.log('[Validation] WARNING: config.jwtSecret has dev default but process.env.JWT_SECRET is set. Using process.env directly.');
      jwtSecret = rawJwtSecret;
    }
    if (jwtRefreshSecret.includes('dev-refresh-secret-key-change-in-production') && rawJwtRefreshSecret && !rawJwtRefreshSecret.includes('dev-refresh-secret-key-change-in-production')) {
      if (isDevLog) console.log('[Validation] WARNING: config.jwtRefreshSecret has dev default but process.env.JWT_REFRESH_SECRET is set. Using process.env directly.');
      jwtRefreshSecret = rawJwtRefreshSecret;
    }

    // If still empty, try process.env as fallback
    if (!jwtSecret && rawJwtSecret) {
      jwtSecret = rawJwtSecret;
    }
    if (!jwtRefreshSecret && rawJwtRefreshSecret) {
      jwtRefreshSecret = rawJwtRefreshSecret;
    }
  } else {
    // In development, use process.env if available, otherwise use config value
    if (!jwtSecret && rawJwtSecret) {
      jwtSecret = rawJwtSecret;
    }
    if (!jwtRefreshSecret && rawJwtRefreshSecret) {
      jwtRefreshSecret = rawJwtRefreshSecret;
    }
  }

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET should be at least 32 characters for security');
  }
  if (isProduction && jwtSecret.includes('dev-secret-key-change-in-production')) {
    throw new Error('JWT_SECRET must be set in production/Vercel (cannot use dev default). Set in Vercel Dashboard → Environment Variables or Railway.');
  }

  // JWT Refresh Secret validation
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET should be at least 32 characters for security');
  }
  if (isProduction && jwtRefreshSecret.includes('dev-refresh-secret-key-change-in-production')) {
    throw new Error('JWT_REFRESH_SECRET must be set in production/Vercel (cannot use dev default). Set in Vercel Dashboard → Environment Variables or Railway.');
  }

  // Update validatedConfig with corrected values
  if (jwtSecret && jwtSecret !== validatedConfig.jwtSecret) {
    (validatedConfig as unknown as Record<string, unknown>).jwtSecret = jwtSecret;
  }
  if (jwtRefreshSecret && jwtRefreshSecret !== validatedConfig.jwtRefreshSecret) {
    (validatedConfig as unknown as Record<string, unknown>).jwtRefreshSecret = jwtRefreshSecret;
  }

  return validatedConfig;
}
