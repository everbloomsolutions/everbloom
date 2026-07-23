export type RuntimePlatform = 'local' | 'vercel' | 'container';

export interface RuntimeEnv {
  VERCEL?: string;
  KUBERNETES_SERVICE_HOST?: string;
  IN_CONTAINER?: string;
  DOCKER?: string;
  IN_DOCKER?: string;
  NODE_ENV?: string;
}

export interface RuntimePolicy {
  platform: RuntimePlatform;
  isVercel: boolean;
  isContainerized: boolean;
  isProductionLike: boolean;
  defaultProtocol: 'http' | 'https';
}

export const detectRuntimePlatform = (env: RuntimeEnv = {}): RuntimePlatform => {
  if (env.VERCEL) return 'vercel';
  if (isContainerizedRuntime(env)) return 'container';
  return 'local';
};

export const isContainerizedRuntime = (env: RuntimeEnv = {}): boolean =>
  !!env.KUBERNETES_SERVICE_HOST ||
  env.IN_CONTAINER === 'true' ||
  env.DOCKER === 'true' ||
  env.IN_DOCKER === 'true';

export const getRuntimePolicy = (nodeEnv?: string, env: RuntimeEnv = {}): RuntimePolicy => {
  const resolvedNodeEnv = nodeEnv || env.NODE_ENV || 'development';
  const platform = detectRuntimePlatform(env);
  const isVercel = platform === 'vercel';
  const isContainerized = platform === 'container';
  const isProductionLike = resolvedNodeEnv === 'production' || isVercel;
  const defaultProtocol: 'http' | 'https' = isProductionLike ? 'https' : 'http';

  return {
    platform,
    isVercel,
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
