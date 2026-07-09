import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AppError } from '../../common/exceptions/app-error';

/**
 * Query Builder Service
 * 
 * Provides reusable query building functions to reduce code duplication
 * and ensure consistency across the codebase.
 */
@Injectable()
export class QueryBuilderService {
  /**
   * Exclude soft-deleted documents from query
   * 
   * Checks both isDeleted and deletedAt fields for backward compatibility.
   */
  excludeDeleted<T extends Record<string, unknown>>(
    query: T
  ): T & Record<string, unknown> {
    const softDeleteConditions = [
      { isDeleted: { $ne: true } },
      { isDeleted: { $exists: false } },
      { deletedAt: { $exists: false } },
      { deletedAt: null },
    ];
    
    // If query already has $or, combine with $and
    if (query.$or) {
      return {
        ...query,
        $and: [
          { $or: Array.isArray(query.$or) ? query.$or : [query.$or] },
          { $or: softDeleteConditions },
        ],
      } as T & { $and: Array<Record<string, unknown>> };
    }
    
    // If query already has $and, add soft delete conditions to it
    if (query.$and) {
      const existingAnd = Array.isArray(query.$and) ? query.$and : [query.$and];
      return {
        ...query,
        $and: [
          ...existingAnd,
          { $or: softDeleteConditions },
        ],
      } as T & { $and: Array<Record<string, unknown>> };
    }
    
    // Otherwise, add $or with soft delete conditions
    return {
      ...query,
      $or: softDeleteConditions,
    } as T & { $or: Array<Record<string, unknown>> };
  }

  /**
   * Include only soft-deleted documents in query
   */
  includeDeleted<T extends Record<string, unknown>>(
    query: T
  ): T & Record<string, unknown> {
    return {
      ...query,
      isDeleted: true,
    };
  }

  /**
   * Build date range query
   */
  buildDateRange(
    startDate?: Date | string,
    endDate?: Date | string,
    field: string = 'createdAt'
  ): Record<string, { $gte?: Date; $lte?: Date }> | Record<string, never> {
    const query: Record<string, { $gte?: Date; $lte?: Date }> = {};

    if (startDate || endDate) {
      query[field] = {};
      if (startDate) {
        const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
        if (isNaN(start.getTime())) {
          throw new AppError(`Invalid start date: ${startDate}`, 400);
        }
        // Set to beginning of day to ensure we capture the full day
        start.setHours(0, 0, 0, 0);
        query[field].$gte = start;
      }
      if (endDate) {
        const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
        if (isNaN(end.getTime())) {
          throw new AppError(`Invalid end date: ${endDate}`, 400);
        }
        // Set to end of day to ensure we capture the full day
        end.setHours(23, 59, 59, 999);
        query[field].$lte = end;
      }
    }

    return query;
  }

  /**
   * Build role-based query filter
   */
  buildRoleFilter(
    userId: string | undefined,
    isAdmin: boolean,
    userIdField: string = 'userId'
  ): Record<string, unknown> {
    if (isAdmin || !userId) {
      return {};
    }

    return {
      [userIdField]: new Types.ObjectId(userId),
    };
  }

  /**
   * Combine multiple query filters
   * 
   * Properly merges $or and $and operators by combining arrays instead of overwriting.
   * Other fields are merged normally.
   */
  combineQueries(
    ...queries: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    return queries.reduce((acc, query) => {
      const merged = { ...acc };
      
      // Merge $or arrays if both queries have them
      if (acc.$or && query.$or) {
        const accOr = Array.isArray(acc.$or) ? acc.$or : [acc.$or];
        const queryOr = Array.isArray(query.$or) ? query.$or : [query.$or];
        merged.$or = [...accOr, ...queryOr];
      } else if (query.$or) {
        merged.$or = query.$or;
      }
      
      // Merge $and arrays if both queries have them
      if (acc.$and && query.$and) {
        const accAnd = Array.isArray(acc.$and) ? acc.$and : [acc.$and];
        const queryAnd = Array.isArray(query.$and) ? query.$and : [query.$and];
        merged.$and = [...accAnd, ...queryAnd];
      } else if (query.$and) {
        merged.$and = query.$and;
      }
      
      // Merge all other fields normally
      Object.keys(query).forEach((key) => {
        if (key !== '$or' && key !== '$and') {
          merged[key] = query[key];
        }
      });
      
      return merged;
    }, {});
  }

}
