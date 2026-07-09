/**
 * Brand Typography
 * Centralized typography definitions for project brand
 * 
 * IMPORTANT: This file mirrors the CSS variables defined in front-end/styles/theme.css
 * 
 * SOURCE OF TRUTH: front-end/styles/theme.css CSS variables (--font-size-*, etc.)
 * 
 * This TypeScript file provides:
 * - Type-safe access to typography values in code
 * - IDE autocomplete and type checking
 * - Runtime values that match CSS variables
 * 
 * When updating typography:
 * 1. Update values in front-end/styles/theme.css (CSS variables)
 * 2. Update this file to match those values exactly
 * 3. Tailwind config automatically uses CSS variables via var(--font-size-*)
 * 
 * Note: These values must stay in sync with theme.css for consistency.
 */

export const brandTypography = {
  fonts: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    mono: "'Fira Code', 'Courier New', monospace",
  },
  
  /**
   * Font sizes - must match CSS variables in theme.css
   * Source: --font-size-* variables in front-end/styles/theme.css
   * 
   * Enhanced scale for better visual distinction between sizes
   */
  fontSizes: {
    xs: '0.75rem',    // 12px - matches --font-size-xs
    sm: '0.875rem',   // 14px - matches --font-size-sm
    base: '1rem',     // 16px - matches --font-size-base
    lg: '1.125rem',   // 18px - matches --font-size-lg
    xl: '1.5rem',     // 24px - matches --font-size-xl (FIXED)
    '2xl': '2rem',    // 32px - matches --font-size-2xl (FIXED)
    '3xl': '2.5rem',  // 40px - matches --font-size-3xl (ENHANCED)
    '4xl': '3rem',    // 48px - matches --font-size-4xl (FIXED)
    '5xl': '3.5rem',  // 56px - matches --font-size-5xl (ENHANCED)
    '6xl': '4rem',    // 64px - matches --font-size-6xl (ENHANCED)
  },
  
  /**
   * Font weights - must match CSS variables in theme.css
   * Source: --font-weight-* variables in front-end/styles/theme.css
   */
  fontWeights: {
    normal: 400,    // matches --font-weight-normal
    medium: 500,    // matches --font-weight-medium
    semibold: 600,  // matches --font-weight-semibold
    bold: 700,      // matches --font-weight-bold
  },
  
  /**
   * Line heights - must match CSS variables in theme.css
   * Source: --line-height-* variables in front-end/styles/theme.css
   */
  lineHeights: {
    none: 1,        // matches --line-height-none
    tight: 1.25,   // matches --line-height-tight
    snug: 1.375,   // matches --line-height-snug
    normal: 1.5,   // matches --line-height-normal
    relaxed: 1.625, // matches --line-height-relaxed
    loose: 2,      // matches --line-height-loose
  },
  
  /**
   * Letter spacing - must match CSS variables in theme.css
   * Source: --letter-spacing-* variables in front-end/styles/theme.css
   */
  letterSpacing: {
    tighter: '-0.05em',  // matches --letter-spacing-tighter
    tight: '-0.025em',   // matches --letter-spacing-tight
    normal: '0em',        // matches --letter-spacing-normal
    wide: '0.025em',     // matches --letter-spacing-wide
    wider: '0.05em',     // matches --letter-spacing-wider
    widest: '0.1em',     // matches --letter-spacing-widest
  },
} as const;

export type BrandTypography = typeof brandTypography;

