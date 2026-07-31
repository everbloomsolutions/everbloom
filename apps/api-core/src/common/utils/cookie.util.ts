/**
 * Lightweight cookie serializer / parser.
 *
 * Avoids adding cookie-parser as a direct dependency while still producing
 * secure, httpOnly, SameSite cookies and parsing inbound Cookie headers.
 */

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number; // seconds
  path?: string;
  expires?: Date;
}

/**
 * Serialize a cookie name/value pair into a Set-Cookie header string.
 */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (typeof options.maxAge === 'number') cookie += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.path) cookie += `; Path=${options.path}`;

  return cookie;
}

/**
 * Parse a Cookie header string into a record.
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [rawKey, ...rawValue] = pair.trim().split('=');
    if (!rawKey) continue;
    const key = decodeURIComponent(rawKey);
    const value = rawValue.length ? decodeURIComponent(rawValue.join('=')) : '';
    result[key] = value;
  }

  return result;
}

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
