/**
 * Brand Configuration
 * Centralized brand identity configuration for Ever Blooming Recycling Solutions Pvt ltd
 */

export const brandConfig = {
  name: 'Ever Blooming Recycling Solutions Pvt ltd',
  tagline: 'Recycling Solutions | Waste Management | E-Waste Processing | Sustainable Solutions',
  description: 'Ever Blooming Recycling Solutions Pvt ltd – Providing dependable, efficient, and safe recycling and waste management solutions',
  shortDescription: 'Trusted leader in onestop recycling solution and sustainable technology integration',
  
  // Contact Information (configurable via environment variables)
  contact: {
    email: import.meta.env.VITE_BRAND_CONTACT_EMAIL || 'works@everbloom.com',
    support: import.meta.env.VITE_BRAND_SUPPORT_EMAIL || 'support@everbloom.com',
    website: import.meta.env.VITE_BRAND_WEBSITE_URL || 'https://everbloom.com',
  },
  
  // Social Media (configurable via environment variables)
  social: {
    twitter: import.meta.env.VITE_BRAND_TWITTER || '@everbloom',
    twitterUrl: import.meta.env.VITE_BRAND_TWITTER_URL || 'https://twitter.com/everbloom',
    github: import.meta.env.VITE_BRAND_GITHUB_URL || 'https://github.com/everbloom',
    linkedin: import.meta.env.VITE_BRAND_LINKEDIN_URL || 'https://linkedin.com/company/everbloom',
  },
  
  // Site Configuration (configurable via environment variables)
  site: {
    url: import.meta.env.VITE_SITE_URL || 'https://everbloom.com',
    name: 'Ever Blooming Recycling Solutions Pvt ltd',
  },
  
  // Legal
  legal: {
    companyName: 'Ever Blooming Recycling Solutions Pvt ltd',
    copyright: `© ${new Date().getFullYear()} Ever Blooming Recycling Solutions Pvt ltd. All rights reserved.`,
  },
} as const;

export type BrandConfig = typeof brandConfig;

