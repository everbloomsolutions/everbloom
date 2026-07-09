// Brand colors - standardized to #3b82f6 (blue-500) as primary
export const themeConfig = {
  colors: {
    light: {
      primary: '#3b82f6', // blue-500 - matches frontend brand
      secondary: '#64748b', // slate-500
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#ffffff',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    dark: {
      primary: '#60a5fa', // blue-400 - lighter for dark mode
      secondary: '#94a3b8',
      background: '#0f172a',
      foreground: '#f8fafc',
      card: '#1e293b',
      border: '#334155',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#60a5fa',
    },
  },
  fonts: {
    sans: "'Inter', sans-serif",
    mono: "'Fira Code', monospace",
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

export default themeConfig;
