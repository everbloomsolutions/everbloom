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
  // ConfigModule.forRoot passes the raw process.env/.env object with UPPER_SNAKE_CASE keys.
  // configuration() passes a normalized camelCase object. Support both by mapping.
  const normalized: Record<string, unknown> = { ...config };
  const mapEnv = (envKey: string, configKey: string) => {
    if (envKey in config && !(configKey in normalized)) {
      normalized[configKey] = config[envKey];
    }
  };

  mapEnv('NODE_ENV', 'nodeEnv');
  mapEnv('PORT', 'port');
  mapEnv('BACKEND_PORT', 'port');
  mapEnv('BACKEND_HOST', 'host');
  mapEnv('HOST', 'host');
  mapEnv('PROTOCOL', 'protocol');
  mapEnv('LOG_LEVEL', 'logLevel');
  mapEnv('MONGODB_URI', 'mongodbUri');
  mapEnv('REDIS_URL', 'redisUrl');
  mapEnv('JWT_SECRET', 'jwtSecret');
  mapEnv('JWT_REFRESH_SECRET', 'jwtRefreshSecret');
  mapEnv('JWT_EXPIRES_IN', 'jwtExpiresIn');
  mapEnv('JWT_REFRESH_EXPIRES_IN', 'jwtRefreshExpiresIn');
  mapEnv('BACKEND_CORS_ORIGIN', 'corsOrigin');
  mapEnv('CORS_ORIGIN', 'corsOrigin');
  mapEnv('ADMIN_PANEL_URL', 'adminPanelUrl');

  const nodeEnv = String(normalized.nodeEnv || 'development');
  const isVercel = Boolean(normalized.isVercel);
  const isProduction = Boolean(normalized.isProduction) || isVercel;

  const configMongodbUri = normalized.mongodbUri ? String(normalized.mongodbUri).trim() : '';
  const finalMongodbUri = configMongodbUri || (isProduction ? '' : 'mongodb://localhost:27017/everbloom');

  const configWithDefaults = {
    ...normalized,
    nodeEnv,
    port: normalized.port ?? 8080,
    host: normalized.host ?? 'localhost',
    protocol: normalized.protocol ?? 'http',
    logLevel: normalized.logLevel ?? 'info',
    mongodbUri: finalMongodbUri,
    redisUrl: normalized.redisUrl ?? (isProduction ? '' : 'redis://localhost:6379'),
    jwtSecret: normalized.jwtSecret ?? '',
    jwtRefreshSecret: normalized.jwtRefreshSecret ?? '',
    jwtExpiresIn: normalized.jwtExpiresIn ?? '7d',
    jwtRefreshExpiresIn: normalized.jwtRefreshExpiresIn ?? '30d',
    adminPanelUrl: normalized.adminPanelUrl ?? (isProduction ? '' : 'http://localhost:3001'),
    corsOrigin: normalized.corsOrigin,
    cloudinary: normalized.cloudinary,
    googleMaps: normalized.googleMaps,
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

  // MongoDB URI validation
  let mongodbUri = validatedConfig.mongodbUri ? String(validatedConfig.mongodbUri).trim() : '';

  if (isProduction && mongodbUri.length === 0) {
    throw new Error('MONGODB_URI is required in production/Vercel.');
  }
  if (mongodbUri.length > 0 && !/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Redis URL validation (optional, but if provided must be valid)
  let redisUrl = String(validatedConfig.redisUrl || '').trim();
  if (redisUrl.length > 0 && !/^redis(s)?:\/\//.test(redisUrl)) {
    throw new Error('REDIS_URL must be a valid Redis connection string');
  }

  // JWT Secret validation
  let jwtSecret = validatedConfig.jwtSecret ? String(validatedConfig.jwtSecret).trim() : '';
  let jwtRefreshSecret = validatedConfig.jwtRefreshSecret ? String(validatedConfig.jwtRefreshSecret).trim() : '';

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

  // Preserve original config extras (runtimePolicy, flags, timeouts) alongside validated fields
  return Object.assign({}, normalized, validatedConfig, {
    mongodbUri,
    redisUrl,
    jwtSecret,
    jwtRefreshSecret,
  }) as Config;
}
