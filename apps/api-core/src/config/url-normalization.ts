import fs from 'fs';

export type RuntimePlatform = 'local' | 'railway' | 'vercel' | 'container';

export interface RuntimePolicy {
  platform: RuntimePlatform;
  isVercel: boolean;
  isRailway: boolean;
  isContainerized: boolean;
  isProductionLike: boolean;
  defaultProtocol: 'http' | 'https';
}

export const detectRuntimePlatform = (): RuntimePlatform => {
  if (process.env.VERCEL) return 'vercel';
  if (
    process.env.RAILWAY ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_SERVICE_NAME ||
    process.env.RAILWAY_PROJECT_NAME
  ) {
    return 'railway';
  }
  if (isContainerizedRuntime()) return 'container';
  return 'local';
};

export const isContainerizedRuntime = (): boolean =>
  process.cwd() === '/app' ||
  process.env.DOCKER === 'true' ||
  process.env.IN_DOCKER === 'true' ||
  fs.existsSync('/.dockerenv') ||
  !!process.env.KUBERNETES_SERVICE_HOST;

export const getRuntimePolicy = (nodeEnv?: string): RuntimePolicy => {
  const env = nodeEnv || process.env.NODE_ENV || 'development';
  const platform = detectRuntimePlatform();
  const isVercel = platform === 'vercel';
  const isRailway = platform === 'railway';
  const isContainerized = platform === 'container' || isRailway;
  const isProductionLike = env === 'production' || isVercel;
  const defaultProtocol: 'http' | 'https' = isProductionLike ? 'https' : 'http';

  return {
    platform,
    isVercel,
    isRailway,
    isContainerized,
    isProductionLike,
    defaultProtocol,
  };
};

export const stripQuotes = (value: string): string => value.trim().replace(/^['"]|['"]$/g, '');

export const normalizeUrl = (value: string, defaultProtocol: 'http' | 'https' = 'https'): string => {
  const trimmed = stripQuotes(value);
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${defaultProtocol}://${trimmed}`;
};

export const normalizeOrigin = (value: string, defaultProtocol: 'http' | 'https' = 'https'): string =>
  normalizeUrl(value, defaultProtocol);

export const parseCommaSeparatedOrigins = (
  value: string | undefined,
  defaultProtocol: 'http' | 'https' = 'https',
): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => normalizeOrigin(origin, defaultProtocol))
    .filter(Boolean);
};

export const uniqueStrings = (values: string[]): string[] => [...new Set(values.map((v) => v).filter(Boolean))];

export const formatAllowedOriginsForLog = (
  origins: string[] | true,
  maxItems = 3,
): { mode: 'allow_all' | 'allow_list'; sample: string[]; count?: number } => {
  if (origins === true) {
    return { mode: 'allow_all', sample: [] };
  }
  const unique = uniqueStrings(origins);
  const sample = unique.slice(0, maxItems);
  return { mode: 'allow_list', sample, count: unique.length };
};

export const resolveAllowedOrigins = (params: {
  corsOrigin?: string;
  adminPanelUrl?: string;
  devFallbackOrigin?: string;
  defaultProtocol?: 'http' | 'https';
}): string[] => {
  const { corsOrigin, adminPanelUrl, devFallbackOrigin, defaultProtocol = 'https' } = params;

  const allowed: string[] = [];

  if (adminPanelUrl) {
    const normalized = normalizeOrigin(adminPanelUrl, defaultProtocol);
    if (normalized) allowed.push(normalized);
  }

  allowed.push(...parseCommaSeparatedOrigins(corsOrigin, defaultProtocol));

  if (allowed.length === 0 && devFallbackOrigin) {
    const normalized = normalizeOrigin(devFallbackOrigin, 'http');
    if (normalized) allowed.push(normalized);
  }

  return uniqueStrings(allowed);
};
