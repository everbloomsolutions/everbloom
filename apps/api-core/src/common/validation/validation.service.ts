import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AppError } from '../exceptions/app-error';

/**
 * Validation Service
 * 
 * Provides validation utilities for common data types and MongoDB operations.
 */
@Injectable()
export class ValidationService {
  /**
   * Validate if a string is a valid MongoDB ObjectId
   * 
   * Validates the input string and converts it to a MongoDB ObjectId.
   * Throws AppError with 400 status if validation fails.
   * 
   * @param id - The string to validate
   * @param fieldName - Optional field name for error message (default: 'ID')
   * @returns The validated ObjectId instance
   * @throws {AppError} If id is empty, not a string, or invalid ObjectId format
   */
  validateObjectId(id: string, fieldName: string = 'ID'): Types.ObjectId {
    if (!id || typeof id !== 'string') {
      throw new AppError(`Invalid ${fieldName}: must be a non-empty string`, 400);
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${fieldName}: not a valid ObjectId`, 400);
    }

    return new Types.ObjectId(id);
  }

  /**
   * Validate multiple ObjectIds
   * 
   * Validates an array of ObjectId strings and converts them to ObjectId instances.
   * Throws AppError if any validation fails.
   * 
   * @param ids - Array of strings to validate
   * @param fieldName - Optional field name for error message (default: 'IDs')
   * @returns Array of validated ObjectId instances
   * @throws {AppError} If any id in the array is invalid
   */
  validateObjectIds(ids: string[], fieldName: string = 'IDs'): Types.ObjectId[] {
    return ids.map((id, index) => this.validateObjectId(id, `${fieldName}[${index}]`));
  }

  /**
   * Safely convert string to ObjectId, returns null if invalid
   * 
   * Non-throwing version of validateObjectId. Returns null instead of throwing
   * for invalid inputs. Useful for optional ObjectId fields.
   * 
   * @param id - The string to convert (can be undefined or null)
   * @returns ObjectId instance if valid, null otherwise
   */
  safeObjectId(id: string | undefined | null): Types.ObjectId | null {
    if (!id || typeof id !== 'string') {
      return null;
    }
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
  }

  /**
   * Find document by ID or throw error if not found
   * 
   * Wrapper around Model.findById() that throws AppError(404) if document is not found.
   * 
   * @param Model - Mongoose model to query
   * @param id - Document ID (string or ObjectId)
   * @param errorMessage - Optional custom error message (default: 'Resource not found')
   * @returns The found document
   * @throws {AppError} If document is not found (404)
   */
  async findByIdOrThrow<T>(
    Model: { findById: (id: Types.ObjectId | string) => Promise<T | null> },
    id: string | Types.ObjectId,
    errorMessage: string = 'Resource not found'
  ): Promise<T> {
    const document = await Model.findById(id);
    if (!document) {
      throw new AppError(errorMessage, 404);
    }
    return document;
  }

  /**
   * Find one document by query or throw error if not found
   * 
   * Wrapper around Model.findOne() that throws AppError(404) if document is not found.
   * 
   * @param Model - Mongoose model to query
   * @param query - Query object
   * @param errorMessage - Optional custom error message (default: 'Resource not found')
   * @returns The found document
   * @throws {AppError} If document is not found (404)
   */
  async findOneOrThrow<T>(
    Model: { findOne: (query: Record<string, unknown>) => Promise<T | null> },
    query: Record<string, unknown>,
    errorMessage: string = 'Resource not found'
  ): Promise<T> {
    const document = await Model.findOne(query);
    if (!document) {
      throw new AppError(errorMessage, 404);
    }
    return document;
  }
}
