/**
 * Lightweight input sanitization helpers.
 *
 * React already escapes strings when rendering, so this is intended for any
 * user-generated value that might be inserted into HTML, a filename, a toast
 * message, or another context where tags/entities could be misinterpreted.
 */

/**
 * Escape HTML special characters so the input is safe to display as text.
 */
export const escapeHtml = (input) => {
  if (typeof input !== 'string') return String(input ?? '');
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Remove common script/style tags and on* event handlers from a string.
 */
export const stripHtml = (input) => {
  if (typeof input !== 'string') return String(input ?? '');
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
    .trim();
};

/**
 * Primary sanitizer: strip dangerous tags and escape remaining HTML entities.
 */
export const sanitizeInput = (input) => {
  return escapeHtml(stripHtml(input));
};

/**
 * Recursively sanitize string properties on a plain object or array.
 */
export const sanitizeObject = (obj) => {
  if (typeof obj === 'string') return sanitizeInput(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeObject(obj[key]);
    }
    return result;
  }
  return obj;
};
