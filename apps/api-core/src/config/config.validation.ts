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
  // Use process.env.NODE_ENV directly to avoid using a stale config.nodeEnv value.
  const actualNodeEnv = process.env.NODE_ENV || 'development';
  const actualIsProduction = actualNodeEnv === 'production' || !!process.env.VERCEL;

  // CRITICAL: If config.mongodbUri is empty but process.env.MONGODB_URI is set,
  // use process.env.MONGODB_URI directly (NestJS ConfigModule may have overridden it).
  const rawMongoUri = process.env.MONGODB_URI;
  const configMongodbUri = config.mongodbUri ? String(config.mongodbUri).trim() : '';
  const finalMongodbUri = (!configMongodbUri && rawMongoUri)
    ? String(rawMongoUri).trim()
    : configMongodbUri;

  const configWithDefaults = {
    nodeEnv: config.nodeEnv ?? actualNodeEnv,
    port: config.port ?? 8080,
    host: config.host ?? 'localhost',
    protocol: config.protocol ?? 'http',
    logLevel: config.logLevel ?? 'info',
    mongodbUri: finalMongodbUri || (actualIsProduction ? '' : 'mongodb://localhost:27017/everbloom'),
    redisUrl: config.redisUrl ?? (actualIsProduction ? '' : 'redis://localhost:6379'),
    jwtSecret: config.jwtSecret ?? '',
    jwtRefreshSecret: config.jwtRefreshSecret ?? '',
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
  let mongodbUri = validatedConfig.mongodbUri ? String(validatedConfig.mongodbUri).trim() : '';

  if (!mongodbUri && process.env.MONGODB_URI) {
    const rawMongoUri = String(process.env.MONGODB_URI).trim();
    if (rawMongoUri) {
      mongodbUri = rawMongoUri;
      (validatedConfig as unknown as Record<string, unknown>).mongodbUri = mongodbUri;
    }
  }

  if (isProduction && mongodbUri.length === 0) {
    const actualEnvVar = process.env.MONGODB_URI;
    const envVarInfo = actualEnvVar
      ? `process.env.MONGODB_URI is set (length: ${actualEnvVar.length}) but config.mongodbUri is empty. This suggests .env files may be overriding it.`
      : 'process.env.MONGODB_URI is not set in the environment.';
    throw new Error(`MONGODB_URI is required in production/Vercel. ${envVarInfo}`);
  }
  if (mongodbUri.length > 0 && !/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Redis URL validation (optional, but if provided must be valid)
  let redisUrl = String(validatedConfig.redisUrl || '').trim();
  if (!redisUrl && process.env.REDIS_URL) {
    const rawRedisUrl = String(process.env.REDIS_URL).trim();
    if (rawRedisUrl) {
      redisUrl = rawRedisUrl;
      (validatedConfig as unknown as Record<string, unknown>).redisUrl = redisUrl;
    }
  }
  if (redisUrl.length > 0 && !/^redis(s)?:\/\//.test(redisUrl)) {
    throw new Error('REDIS_URL must be a valid Redis connection string');
  }

  // JWT Secret validation
  let jwtSecret = validatedConfig.jwtSecret ? String(validatedConfig.jwtSecret).trim() : '';
  let jwtRefreshSecret = validatedConfig.jwtRefreshSecret ? String(validatedConfig.jwtRefreshSecret).trim() : '';

  // If config is empty, try process.env as a fallback.
  const rawJwtSecret = process.env.JWT_SECRET?.trim() || '';
  const rawJwtRefreshSecret = process.env.JWT_REFRESH_SECRET?.trim() || '';

  if (!jwtSecret && rawJwtSecret) {
    jwtSecret = rawJwtSecret;
  }
  if (!jwtRefreshSecret && rawJwtRefreshSecret) {
    jwtRefreshSecret = rawJwtRefreshSecret;
  }

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET should be at least 32 characters for security');
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET should be at least 32 characters for security');
  }

  // Reject placeholder/default secrets in any environment.
  if (jwtSecret.includes('dev-secret-key-change-in-production')) {
    throw new Error('JWT_SECRET must not be a placeholder/default value. Set a real secret via environment variables.');
  }
  if (jwtRefreshSecret.includes('dev-refresh-secret-key-change-in-production')) {
    throw new Error('JWT_REFRESH_SECRET must not be a placeholder/default value. Set a real secret via environment variables.');
  }

  // Update validatedConfig with corrected values
  if (jwtSecret !== validatedConfig.jwtSecret) {
    (validatedConfig as unknown as Record<string, unknown>).jwtSecret = jwtSecret;
  }
  if (jwtRefreshSecret !== validatedConfig.jwtRefreshSecret) {
    (validatedConfig as unknown as Record<string, unknown>).jwtRefreshSecret = jwtRefreshSecret;
  }

  return validatedConfig;
}
