/**
 * Configuration helpers
 *
 * Utility functions for configuration checks.
 * VERCEL=1 is treated as production (no localhost defaults, require env vars).
 */

export const isVercel = (): boolean => !!process.env.VERCEL;

export const isDevelopment = (nodeEnv?: string): boolean => {
  if (process.env.VERCEL) return false;
  return (nodeEnv || process.env.NODE_ENV || 'development') === 'development';
};

export const isProduction = (nodeEnv?: string): boolean => {
  if (process.env.VERCEL) return true;
  return (nodeEnv || process.env.NODE_ENV || 'development') === 'production';
};
