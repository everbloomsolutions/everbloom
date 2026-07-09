/**
 * Logo Component for Admin Panel
 * Reusable logo component with support for light/dark modes
 */

import { Link } from 'react-router-dom';

export function Logo({ variant: _variant = 'auto', size = 'md', href, className = '' }) {
  // Use SVG logo
  const logoSrc = '/logo.svg';

  // Size classes adjusted for logo aspect ratio (112.03:60.51 ≈ 1.85:1)
  // Height-based sizing with width auto maintains aspect ratio
  const sizeClasses = {
    sm: 'h-8 w-auto',   // Small size for mobile
    md: 'h-10 w-auto',  // Medium size for navbar
    lg: 'h-16 w-auto',  // Large size for auth pages
  };

  const logoElement = (
    <img
      src={logoSrc}
      alt="Ever Blooming Recycling Solutions"
      className={`${sizeClasses[size]} object-contain ${className}`}
      aria-label="Ever Blooming Recycling Solutions Home"
    />
  );

  if (href) {
    return (
      <Link to={href} className={`flex items-center justify-center ${className}`}>
        {logoElement}
      </Link>
    );
  }

  return <div className={`flex items-center justify-center ${className}`}>{logoElement}</div>;
}

export default Logo;

