import { Injectable } from '@nestjs/common';
import xss from 'xss';

// XSS filter options
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

/**
 * Sanitize Service
 * 
 * Provides input sanitization utilities to prevent XSS attacks.
 */
@Injectable()
export class SanitizeService {
  /**
   * Sanitize a string to prevent XSS attacks
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return xss(input.trim(), xssOptions);
  }

  /**
   * Sanitize HTML content (allows some safe tags)
   */
  sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return xss(input.trim());
  }

  /**
   * Sanitize an object's string properties (recursive)
   */
  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        (sanitized as Record<string, unknown>)[key] = this.sanitizeString(sanitized[key] as string);
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
        (sanitized as Record<string, unknown>)[key] = this.sanitizeObject(sanitized[key] as Record<string, unknown>);
      } else if (Array.isArray(sanitized[key])) {
        (sanitized as Record<string, unknown>)[key] = (sanitized[key] as unknown[]).map((item) => {
          if (typeof item === 'string') {
            return this.sanitizeString(item);
          } else if (typeof item === 'object' && item !== null) {
            return this.sanitizeObject(item as Record<string, unknown>);
          }
          return item;
        });
      }
    }
    return sanitized;
  }

  /**
   * Escape HTML entities for safe display
   */
  escapeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
