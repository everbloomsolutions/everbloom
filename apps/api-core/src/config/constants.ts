/**
 * Business Constants
 * 
 * Centralized location for all business logic constants.
 * These values should be configurable via environment variables when appropriate,
 * but defaults are defined here to avoid magic numbers throughout the codebase.
 */

/**
 * Pagination Constants
 */
export const PAGINATION = {
  /** Default number of items per page */
  DEFAULT_LIMIT: 10,
  /** Maximum number of items per page (hard limit) */
  MAX_LIMIT: 100,
  /** Default page number (1-indexed) */
  DEFAULT_PAGE: 1,
} as const;

/**
 * Tax & Financial Constants
 */
export const FINANCIAL = {
  /** Default GST rate (percentage) */
  DEFAULT_GST_RATE: 18,
  /** Minimum GST rate (percentage) */
  MIN_GST_RATE: 0,
  /** Maximum GST rate (percentage) */
  MAX_GST_RATE: 100,
  /** Minimum collection item weight (kg) */
  MIN_COLLECTION_WEIGHT: 0.1,
} as const;

/**
 * Request Size Limits
 */
export const REQUEST_LIMITS = {
  /** Maximum request body size (bytes) */
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
  /** Maximum file upload size (bytes) */
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  /** Maximum number of files per upload */
  MAX_FILES_PER_UPLOAD: 10,
} as const;

/**
 * Database Query Limits
 */
export const DATABASE = {
  /** Maximum results for duplicate checking */
  MAX_DUPLICATE_CHECK_RESULTS: 50,
  /** Maximum results for autocomplete/search */
  MAX_AUTOCOMPLETE_RESULTS: 20,
  /** Connection pool maximum size */
  MAX_POOL_SIZE: 10,
  /** Connection pool minimum size */
  MIN_POOL_SIZE: 1,
} as const;

/**
 * Timeout Constants (milliseconds)
 */
export const TIMEOUTS = {
  /** Database query timeout (local) */
  DB_QUERY_LOCAL: 5000,
  /** Database query timeout (Atlas) */
  DB_QUERY_ATLAS: 30000,
  /** Redis connection timeout */
  REDIS_CONNECTION: 5000,
  /** Scheduler initialization timeout */
  SCHEDULER_INIT: 3000,
} as const;

/**
 * Rate Limiting Constants
 */
export const RATE_LIMITS = {
  /** Contact form submissions per window */
  CONTACT_FORM_MAX: 5,
  /** Contact form window (milliseconds) */
  CONTACT_FORM_WINDOW: 15 * 60 * 1000, // 15 minutes
  /** Auth attempts per window */
  AUTH_MAX: 10,
  /** Auth window (milliseconds) */
  AUTH_WINDOW: 15 * 60 * 1000, // 15 minutes
  /** General API requests per window */
  GENERAL_MAX: 100,
  /** General API window (milliseconds) */
  GENERAL_WINDOW: 15 * 60 * 1000, // 15 minutes
  /** Strict auth attempts per window */
  STRICT_AUTH_MAX: 5,
} as const;

/**
 * String Length Limits
 */
export const STRING_LIMITS = {
  /** Maximum location name length */
  LOCATION_NAME_MAX: 200,
  /** Maximum address length */
  ADDRESS_MAX: 500,
  /** Maximum description length */
  DESCRIPTION_MAX: 5000,
  /** Maximum title length */
  TITLE_MAX: 200,
  /** Maximum notes length */
  NOTES_MAX: 2000,
} as const;

/**
 * Similarity Thresholds
 */
export const SIMILARITY = {
  /** Default duplicate detection threshold (0-1) */
  DEFAULT_DUPLICATE_THRESHOLD: 0.8,
  /** Minimum similarity for name matching */
  NAME_WEIGHT: 0.6,
  /** Minimum similarity for address matching */
  ADDRESS_WEIGHT: 0.4,
} as const;

/**
 * Audit Log Retention Policy
 */
export const AUDIT_RETENTION = {
  /** Default retention period in days (90 days = ~3 months) */
  DEFAULT_RETENTION_DAYS: 90,
  /** Minimum retention period in days (30 days for compliance) */
  MIN_RETENTION_DAYS: 30,
  /** Maximum retention period in days (365 days = 1 year) */
  MAX_RETENTION_DAYS: 365,
  /** Retention period for critical actions (deletions, transfers) in days */
  CRITICAL_RETENTION_DAYS: 365,
} as const;

