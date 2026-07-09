/**
 * Brand Configuration for Backend
 * Used for email templates, API metadata, and other backend Ever Blooming Recycling Solutions Pvt ltd needs
 */

export const brandConfig = {
  name: 'Ever Blooming Recycling Solutions Pvt ltd',
  tagline: 'Recycling Solutions | Waste Management | E-Waste Processing | Sustainable Solutions',
  description: 'Ever Blooming Recycling Solutions Pvt ltd – Providing dependable, efficient, and safe recycling and waste management solutions',
  
  // Brand Colors (for email templates)
  colors: {
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
  },
  
  // Contact Information
  contact: {
    email: 'works@everbloom.com',
    support: 'support@everbloom.com',
    website: 'https://everbloom.com',
  },
  
  // Legal Information
  legal: {
    copyright: '© 2025 Ever Blooming Recycling Solutions Pvt ltd. All rights reserved.',
  },
  
  // Social Media
  social: {
    twitter: '@everbloom',
    twitterUrl: 'https://twitter.com/everbloom',
  },
  
  // API Metadata
  api: {
    name: 'Ever Blooming Recycling Solutions API',
    version: '1.0.0',
    description: 'Ever Blooming Recycling Solutions Pvt ltd API - Onestop recycling solution and sustainable technology solutions backend',
  },
} as const;

export type BrandConfig = typeof brandConfig;

