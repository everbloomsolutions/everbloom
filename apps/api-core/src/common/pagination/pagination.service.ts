import { Injectable } from '@nestjs/common';
import { PAGINATION } from '../../config/constants';

/**
 * Pagination Service
 * 
 * Provides type-safe utilities for handling pagination in database queries.
 * All functions enforce maximum limits to prevent DoS attacks and performance issues.
 */
@Injectable()
export class PaginationService {
  /**
   * Validate and clamp pagination limit
   * 
   * @param limit - The limit value to validate
   * @param maxLimit - Maximum allowed limit (defaults to PAGINATION.MAX_LIMIT)
   * @param defaultLimit - Default limit if not provided (defaults to PAGINATION.DEFAULT_LIMIT)
   * @returns Validated limit value clamped between 1 and maxLimit
   */
  validateLimit(
    limit: number | undefined | null,
    maxLimit: number = PAGINATION.MAX_LIMIT,
    defaultLimit: number = PAGINATION.DEFAULT_LIMIT
  ): number {
    if (limit === undefined || limit === null || isNaN(limit)) {
      return defaultLimit;
    }

    // Ensure limit is a positive integer
    const numLimit = Math.max(1, Math.floor(Math.abs(limit)));

    // Clamp to maximum
    return Math.min(numLimit, maxLimit);
  }

  /**
   * Validate and clamp pagination page number
   * 
   * @param page - The page number to validate (1-indexed)
   * @param defaultPage - Default page if not provided (defaults to PAGINATION.DEFAULT_PAGE)
   * @returns Validated page number (always >= 1)
   */
  validatePage(
    page: number | undefined | null,
    defaultPage: number = PAGINATION.DEFAULT_PAGE
  ): number {
    if (page === undefined || page === null || isNaN(page)) {
      return defaultPage;
    }

    // Ensure page is a positive integer
    return Math.max(1, Math.floor(Math.abs(page)));
  }

  /**
   * Calculate skip value for pagination
   * 
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Skip value for database query (MongoDB skip parameter)
   */
  calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate total number of pages
   * 
   * @param total - Total number of items in collection
   * @param limit - Items per page
   * @returns Total number of pages (rounded up)
   */
  calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }
}
