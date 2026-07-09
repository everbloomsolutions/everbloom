/**
 * Brand Color Palette
 * Centralized color definitions for project brand
 */

export const brandColors = {
  primary: {
    DEFAULT: '#3b82f6', // blue-500
    hover: '#2563eb',    // blue-600
    light: '#dbeafe',     // blue-100
    dark: '#1e40af',     // blue-800
  },
  secondary: {
    DEFAULT: '#64748b',  // slate-500
    hover: '#475569',    // slate-600
    light: '#f1f5f9',    // slate-100
    dark: '#334155',     // slate-700
  },
  accent: {
    DEFAULT: '#8b5cf6',  // purple-500
    hover: '#7c3aed',    // purple-600
    light: '#ede9fe',    // purple-100
    dark: '#6d28d9',     // purple-700
  },
  status: {
    success: '#10b981',  // emerald-500
    warning: '#f59e0b',   // amber-500
    error: '#ef4444',    // red-500
    info: '#3b82f6',     // blue-500
  },
} as const;

export const brandColorsDark = {
  primary: {
    DEFAULT: '#60a5fa',  // blue-400
    hover: '#3b82f6',    // blue-500
    light: '#1e3a8a',    // blue-900
    dark: '#1e40af',     // blue-800
  },
  secondary: {
    DEFAULT: '#94a3b8',   // slate-400
    hover: '#64748b',    // slate-500
    light: '#1e293b',    // slate-800
    dark: '#0f172a',     // slate-900
  },
  accent: {
    DEFAULT: '#a78bfa',  // purple-400
    hover: '#8b5cf6',    // purple-500
    light: '#4c1d95',    // purple-900
    dark: '#6d28d9',     // purple-700
  },
  status: {
    success: '#34d399',   // emerald-400
    warning: '#fbbf24',   // amber-400
    error: '#f87171',    // red-400
    info: '#60a5fa',     // blue-400
  },
} as const;

export type BrandColors = typeof brandColors;
export type BrandColorsDark = typeof brandColorsDark;

