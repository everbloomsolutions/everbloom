/**
 * Admin user management service
 */

import { User, IUserResponse, toUserResponse, IUser } from '../user/user.model';
import { AppError } from '../../common/exceptions/app-error';
// Note: Using MailService - this function-based service should be converted to NestJS service class
import { MailService } from '../../infrastructure/mail/mail.service';
import { createLogger } from '../../infrastructure/logger';
import mongoose, { Model } from 'mongoose';

const logger = createLogger();
import { PaginationService } from '../../common/pagination/pagination.service';
import { ValidationService } from '../../common/validation/validation.service';
import { QueryBuilderService } from '../../infrastructure/database/query-builder.service';
import { PAGINATION } from '../../config/constants';
import * as locationAssignmentService from '../location/location.assignment.service';
import { Location, ILocation } from '../location/location.model';
import { Project } from '../project/project.model';

 const normalizeEmailKey = (value: string): string => String(value || '').trim().toLowerCase();

/**
 * Get User model from the default Mongoose connection
 * Note: Connection readiness is already verified by ensureConnectionReady() before this is called
 * This function just returns the model - no additional connection checks needed
 *
 * @param verifiedConnection - Optional verified connection instance from DatabaseService
 */
const getUserModel = (verifiedConnection?: mongoose.Connection): Model<IUser> => {
  // If a verified connection is provided, use it (this ensures we use the same connection that was verified)
  const connection = verifiedConnection || mongoose.connection;

  // Final safety check - if connection is disconnected, log warning but still return model
  // (the query will fail if connection is truly down, but at least we tried)
  if ((connection.readyState as number) !== 1) {
    console.warn(`[getUserModel] Warning: Connection state is ${connection.readyState} when getting User model. This should have been caught by ensureConnectionReady().`);
  }

  // Get or create the model from the connection
  if (connection.models.User) {
    return connection.models.User as Model<IUser>;
  }
  // Fallback to the exported User model (uses default connection)
  return User as Model<IUser>;
};

/**
 * Get Location model from the verified connection
 *
 * @param verifiedConnection - Optional verified connection instance from DatabaseService
 */
const getLocationModel = (verifiedConnection?: mongoose.Connection): Model<ILocation> => {
  // If a verified connection is provided, use it (this ensures we use the same connection that was verified)
  const connection = verifiedConnection || mongoose.connection;

  // Get or create the model from the connection
  if (connection.models.Location) {
    return connection.models.Location as Model<ILocation>;
  }
  // Fallback to the exported Location model (uses default connection)
  return Location as Model<ILocation>;
};

/**
 * Get Project model from the verified connection
 *
 * @param verifiedConnection - Optional verified connection instance from DatabaseService
 */
const getProjectModel = (verifiedConnection?: mongoose.Connection): Model<any> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models.Project) {
    return connection.models.Project as Model<any>;
  }
  return Project as Model<any>;
};

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'agent' | 'admin' | 'super_admin';
  isActive?: boolean;
}

export interface UserListResponse {
  users: IUserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
  role?: 'user' | 'agent' | 'admin' | 'super_admin';
  isActive?: boolean;
  defaultLocationId?: string;
  assignedLocationIds?: string[];
}

 type ArchiveDuplicatesMode = 'dry-run' | 'apply';

 export interface UserDuplicateGroupReport {
   email: string;
   keepId: string;
   archivedIds: string[];
   skippedIds: string[];
 }

 export interface ArchiveDuplicateUsersReport {
   groups: UserDuplicateGroupReport[];
   totals: {
     groups: number;
     candidates: number;
     archived: number;
     skipped: number;
   };
 }

 export const archiveDuplicateUsers = async (params: {
   mode: ArchiveDuplicatesMode;
   limitGroups?: number;
 }, verifiedConnection?: mongoose.Connection): Promise<ArchiveDuplicateUsersReport> => {
  const UserModel = getUserModel(verifiedConnection);
  const ProjectModel = getProjectModel(verifiedConnection);
   const { mode, limitGroups } = params;

   const users = await UserModel.find({
     isDeleted: { $ne: true },
     deletedAt: { $exists: false },
     email: { $exists: true, $ne: null },
   })
     .select('_id email role isActive createdAt')
     .lean();

   const groupsByEmail = new Map<string, Array<any>>();
   for (const user of users) {
     const key = normalizeEmailKey(user.email);
     const existing = groupsByEmail.get(key) || [];
     existing.push(user);
     groupsByEmail.set(key, existing);
   }

   const duplicateGroups = Array.from(groupsByEmail.entries())
     .filter(([, items]) => items.length > 1)
     .slice(0, typeof limitGroups === 'number' ? Math.max(0, limitGroups) : undefined);

   const report: ArchiveDuplicateUsersReport = {
     groups: [],
     totals: {
       groups: duplicateGroups.length,
       candidates: 0,
       archived: 0,
       skipped: 0,
     },
   };

   for (const [email, items] of duplicateGroups) {
     // Choose canonical by earliest createdAt (stable), then by _id.
     const sorted = [...items].sort((a, b) => {
       const createdDiff = (a.createdAt ? new Date(a.createdAt).getTime() : 0)
         - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
       if (createdDiff !== 0) return createdDiff;
       return String(a._id).localeCompare(String(b._id));
     });

     const keep = sorted[0];
     const rest = sorted.slice(1);
     report.totals.candidates += rest.length;

     const groupReport: UserDuplicateGroupReport = {
       email,
       keepId: String(keep._id),
       archivedIds: [],
       skippedIds: [],
     };

     for (const dup of rest) {
       const dupId = dup._id;
       const activeCollectionCount = await ProjectModel.countDocuments({
         $or: [
           { userId: dupId, isDeleted: { $ne: true }, deletedAt: { $exists: false } },
           { collectedBy: dupId, isDeleted: { $ne: true }, deletedAt: { $exists: false } },
         ],
       });

       if (activeCollectionCount > 0) {
         groupReport.skippedIds.push(String(dupId));
         report.totals.skipped += 1;
         continue;
       }

       groupReport.archivedIds.push(String(dupId));
       report.totals.archived += 1;

       if (mode === 'apply') {
         await UserModel.updateOne(
           { _id: dupId },
           { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } },
         );
       }
     }

     report.groups.push(groupReport);
   }

   return report;
 };

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: 'user' | 'agent' | 'admin' | 'super_admin';
  isActive?: boolean;
  password?: string;
  defaultLocationId?: string;
  assignedLocationIds?: string[];
}

/**
 * Get paginated list of users
 *
 * Retrieves users with optional filtering by role, active status, and search.
 * Uses text search for email and name fields (faster than regex).
 *
 * @param params - Query parameters for filtering and pagination
 * @param params.page - Page number (default: 1)
 * @param params.limit - Items per page (default: 10, max: 100)
 * @param params.search - Search term for email or name (uses text search)
 * @param params.role - Filter by role: 'admin' or 'agent'
 * @param params.isActive - Filter by active status
 * @param verifiedConnection - Optional verified connection from DatabaseService (ensures same connection instance)
 * @returns Paginated list of users (passwords excluded) with metadata
 *
 * @example
 * ```typescript
 * const result = await getUsers({
 *   page: 1,
 *   limit: 20,
 *   search: 'john',
 *   role: 'agent',
 *   isActive: true
 * });
 * ```
 */
export const getUsers = async (params: UserListParams = {}, verifiedConnection?: mongoose.Connection): Promise<UserListResponse> => {
  const paginationService = new PaginationService();
  const queryBuilder = new QueryBuilderService();
  const validatedPage = paginationService.validatePage(params.page, 1);
  const validatedLimit = paginationService.validateLimit(params.limit, PAGINATION.MAX_LIMIT, PAGINATION.DEFAULT_LIMIT);
  const skip = paginationService.calculateSkip(validatedPage, validatedLimit);

  // Build query
  const query = queryBuilder.excludeDeleted({});

  if (params.search) {
    // Search by name or email
    const searchRegex = new RegExp(params.search.trim(), 'i');
    query.$or = [
      { name: { $regex: searchRegex, $exists: true, $ne: null } },
      { email: { $regex: searchRegex } },
    ];
  }

  if (params.role) {
    query.role = params.role;
  }

  if (params.isActive !== undefined) {
    query.isActive = params.isActive;
  }

  // Get users and total count - use model from verified connection to ensure same connection instance
  // If verifiedConnection is provided, use it (this is the connection that was verified by DatabaseService)
  const connection = verifiedConnection || mongoose.connection;
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);

  // Final connection check right before query (connection might have disconnected)
  if ((connection.readyState as number) !== 1) {
    // Connection disconnected - wait briefly for reconnection
    logger.warn(`[getUsers] Connection disconnected before query (state: ${connection.readyState}), waiting for reconnection...`);
    const maxWait = 5000; // 5 seconds
    const startTime = Date.now();
    while ((connection.readyState as number) !== 1) {
      if (Date.now() - startTime > maxWait) {
        throw new Error(`MongoDB connection not ready after waiting. State: ${connection.readyState}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Verify with ping after reconnection
    try {
      await connection.db?.admin().ping();
    } catch (error) {
      throw new Error(`MongoDB connection ping failed after reconnection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const [users, total] = await Promise.all([
    UserModel.find(query)
      .select('-password')
      .populate('defaultLocation', 'locationName locality address city state locationType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(validatedLimit)
      .lean(),
    UserModel.countDocuments(query),
  ]);

  // For agents, add locationCount
  const usersWithLocationCount = await Promise.all(
    users.map(async (user: Record<string, unknown>) => {
      const userResponse = toUserResponse(user as Record<string, unknown>);

      // If user is an agent, count their assigned locations using the verified connection
      if (user.role === 'agent' && user._id) {
        const locationCount = await LocationModel.countDocuments({
          assignedToAgent: user._id,
          isDeleted: { $ne: true },
          deletedAt: { $exists: false },
        });
        return {
          ...userResponse,
          locationCount,
        };
      }

      return userResponse;
    })
  );

  return {
    users: usersWithLocationCount,
    total,
    page: validatedPage,
    limit: validatedLimit,
    totalPages: paginationService.calculateTotalPages(total, validatedLimit),
  };
};

/**
 * Get user by ID
 *
 * @param userId - User ID (must be valid ObjectId)
 * @returns User data without password
 * @throws {AppError} If userId is invalid ObjectId format (400) or user not found (404)
 *
 * @example
 * ```typescript
 * const user = await getUserById('507f1f77bcf86cd799439011');
 * ```
 */
export const getUserById = async (userId: string, verifiedConnection?: mongoose.Connection): Promise<IUserResponse> => {
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const UserModel = getUserModel(verifiedConnection);
  const user = await UserModel.findById(userObjectId)
    .select('-password')
    .populate('defaultLocation', 'locationName locality address city state locationType')
    .lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return toUserResponse(user as Record<string, unknown>);
};

/**
 * Get allowed roles for user creation based on creator's role
 */
const getAllowedRolesForCreation = (creatorRole: string): string[] => {
  switch (creatorRole) {
    case 'super_admin':
      return ['user', 'agent', 'admin'];
    case 'admin':
      return ['user', 'agent'];
    default:
      return [];
  }
};

/**
 * Create a new user
 *
 * Creates a new user account and sends a welcome email (non-blocking).
 * User creation succeeds even if email sending fails.
 *
 * @param data - User creation data
 * @param data.email - User email (will be lowercased)
 * @param data.password - User password (will be hashed)
 * @param data.name - User name
 * @param data.role - User role (default: 'agent')
 * @param data.isActive - Whether user is active (default: true)
 * @param creatorRole - Role of the user creating this account
 * @returns Created user data without password
 * @throws {AppError} If email already exists (400) or role is not allowed (403)
 *
 * @example
 * ```typescript
 * const user = await createUser({
 *   email: 'john@example.com',
 *   password: 'SecurePass123',
 *   name: 'John Doe',
 *   role: 'agent'
 * }, 'admin');
 * ```
 */
export const createUser = async (
  data: CreateUserData,
  creatorRole: string,
  mailService?: MailService
, verifiedConnection?: mongoose.Connection): Promise<IUserResponse> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  // Validate role creation permissions
  const allowedRoles = getAllowedRolesForCreation(creatorRole);
  const requestedRole = data.role || 'agent';

  if (!allowedRoles.includes(requestedRole)) {
    throw new AppError(
      `You do not have permission to create users with role '${requestedRole}'. Allowed roles: ${allowedRoles.join(', ')}`,
      403
    );
  }

  // Check if user already exists
  const existingUser = await UserModel.findOne({ email: data.email.toLowerCase() });
  if (existingUser) {
    const duplicateError = new AppError('A user with this email already exists', 400);
    duplicateError.errors = [
      { field: 'email', message: 'A user with this email already exists. Please use a different email address.' }
    ];
    throw duplicateError;
  }

  // Validate location assignment requirements before creating user
  if (requestedRole === 'user' && !data.defaultLocationId) {
    const locationError = new AppError('Default location is required for users', 400);
    locationError.errors = [
      { field: 'defaultLocationId', message: 'Default location is required for users. Please select a location from the dropdown.' }
    ];
    throw locationError;
  }

  if (requestedRole === 'agent' && (!data.assignedLocationIds || data.assignedLocationIds.length === 0)) {
    const locationError = new AppError('At least one location must be assigned to agents', 400);
    locationError.errors = [
      { field: 'assignedLocationIds', message: 'At least one location must be assigned to agents. Please add at least one location using the location selector.' }
    ];
    throw locationError;
  }

  // Validate locations exist BEFORE creating user (to avoid rollback)
  if (requestedRole === 'user' && data.defaultLocationId) {
    try {
      const validationService = new ValidationService();
      const locationObjectId = validationService.validateObjectId(data.defaultLocationId, 'defaultLocationId');
      const location = await LocationModel.findOne({
        _id: locationObjectId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      });

      if (!location) {
        const locationError = new AppError('Default location not found or has been deleted', 400);
        locationError.errors = [
          { field: 'defaultLocationId', message: 'The selected location does not exist or has been deleted. Please select a valid location from the dropdown.' }
        ];
        throw locationError;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const locationError = new AppError('Invalid default location ID', 400);
      locationError.errors = [
        { field: 'defaultLocationId', message: `Invalid location ID: ${error instanceof Error ? error.message : 'Unknown error'}. Please select a valid location from the dropdown.` }
      ];
      throw locationError;
    }
  }

  if (requestedRole === 'agent' && data.assignedLocationIds && data.assignedLocationIds.length > 0) {
    // Validate all locations exist before creating user
    try {
      const { invalid } = await locationAssignmentService.validateLocationsExist(data.assignedLocationIds, verifiedConnection);

      if (invalid.length > 0) {
        const invalidIds = invalid.map(i => i.locationId).join(', ');
        const reasons = invalid.map(i => `${i.locationId}: ${i.reason}`).join('; ');
        const locationError = new AppError(
          `Invalid locations provided: ${reasons}`,
          400
        );
        locationError.errors = [
          { field: 'assignedLocationIds', message: `One or more selected locations do not exist or have been deleted: ${invalidIds}. Please select valid locations from the dropdown.` }
        ];
        throw locationError;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const locationError = new AppError('Failed to validate locations', 400);
      locationError.errors = [
        { field: 'assignedLocationIds', message: `Failed to validate locations: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify all locations exist and try again.` }
      ];
      throw locationError;
    }
  }

  const user = await UserModel.create({
    email: data.email.toLowerCase(),
    password: data.password,
    name: data.name,
    role: requestedRole,
    isActive: data.isActive !== undefined ? data.isActive : true,
  });

  // Handle defaultLocationId (for users with role 'user') - REQUIRED
  if (user.role === 'user') {
    // We've already validated that defaultLocationId is present, so it must exist here
    if (!data.defaultLocationId) {
      await UserModel.findByIdAndDelete(user._id);
      const locationError = new AppError('Default location is required for users', 400);
      locationError.errors = [
        { field: 'defaultLocationId', message: 'Default location is required for users. Please select a location from the dropdown.' }
      ];
      throw locationError;
    }

    try {
      await locationAssignmentService.assignLocationToUser(user._id.toString(), data.defaultLocationId, verifiedConnection);
    } catch (error) {
      // If location assignment fails, delete the user and throw error
      await UserModel.findByIdAndDelete(user._id);
      const assignmentError = new AppError(
        `Failed to assign default location: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400
      );
      assignmentError.errors = [
        { field: 'defaultLocationId', message: `Failed to assign location: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify the location exists and try again.` }
      ];
      throw assignmentError;
    }
  }

  // Handle assignedLocationIds (for agents) - REQUIRED
  if (user.role === 'agent') {
    // We've already validated that assignedLocationIds is present and non-empty, so it must exist here
    if (!data.assignedLocationIds || data.assignedLocationIds.length === 0) {
      await UserModel.findByIdAndDelete(user._id);
      const locationError = new AppError('At least one location must be assigned to agents', 400);
      locationError.errors = [
        { field: 'assignedLocationIds', message: 'At least one location must be assigned to agents. Please add at least one location using the location selector.' }
      ];
      throw locationError;
    }

    try {
      await locationAssignmentService.assignLocationsToAgent(user._id.toString(), data.assignedLocationIds, verifiedConnection);
    } catch (error) {
      // If location assignment fails, delete the user and throw error
      await UserModel.findByIdAndDelete(user._id);
      const assignmentError = new AppError(
        `Failed to assign locations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400
      );
      assignmentError.errors = [
        { field: 'assignedLocationIds', message: `Failed to assign locations: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify the locations exist and try again.` }
      ];
      throw assignmentError;
    }
  }

  // Send welcome email (non-blocking, fire-and-forget)
  if (mailService) {
    (async () => {
      try {
        await mailService.sendWelcomeEmail({
          email: user.email,
          name: user.name,
          password: data.password, // Include password in email for new users
          role: user.role,
        });
      } catch (error) {
        logger.error('Failed to send welcome email to new user:', {
          userId: user._id,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't throw - user creation should succeed even if email fails
      }
    })();
  }

  // Fetch user with populated location data
  const userWithLocation = await UserModel.findById(user._id)
    .populate('defaultLocation', 'locationName locality address city state locationType')
    .lean();
  return toUserResponse(userWithLocation || user);
};

/**
 * Update user
 *
 * Updates user information. Password updates are hashed automatically.
 *
 * @param userId - User ID (must be valid ObjectId)
 * @param data - User update data (all fields optional)
 * @returns Updated user data without password
 * @throws {AppError} If userId is invalid ObjectId format (400) or user not found (404)
 *
 * @example
 * ```typescript
 * const user = await updateUser('507f1f77bcf86cd799439011', {
 *   name: 'John Smith',
 *   isActive: false
 * });
 * ```
 */
export const updateUser = async (
  userId: string,
  data: UpdateUserData,
  creatorRole?: string
, verifiedConnection?: mongoose.Connection): Promise<IUserResponse> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const user = await UserModel.findById(userObjectId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if email is being changed and if it's already taken
  if (data.email && data.email.toLowerCase() !== user.email) {
    const existingUser = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }
    user.email = data.email.toLowerCase();
  }

  if (data.name !== undefined) {
    user.name = data.name;
  }

  if (data.role !== undefined) {
    // Validate role change permissions - only super_admin can assign admin role
    if (data.role === 'admin' && creatorRole !== 'super_admin') {
      throw new AppError('Only super admins can assign admin role', 403);
    }
    user.role = data.role;
  }

  if (data.isActive !== undefined) {
    user.isActive = data.isActive;
  }

  if (data.password) {
    user.password = data.password; // Will be hashed by pre-save hook
  }

  // Handle defaultLocationId (for users with role 'user')
  if (data.defaultLocationId !== undefined) {
    if (data.defaultLocationId === null || data.defaultLocationId === '') {
      // Remove default location
      await locationAssignmentService.removeLocationFromUser(userId, verifiedConnection);
    } else {
      // Validate location exists before assigning
      const validationService = new ValidationService();
      const locationObjectId = validationService.validateObjectId(data.defaultLocationId, 'defaultLocationId');
      const location = await LocationModel.findOne({
        _id: locationObjectId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      });

      if (!location) {
        throw new AppError('Default location not found or has been deleted', 400);
      }

      // Set default location
      await locationAssignmentService.assignLocationToUser(userId, data.defaultLocationId, verifiedConnection);
    }
  }

  // Handle assignedLocationIds (for agents)
  if (data.assignedLocationIds !== undefined) {
    if (user.role !== 'agent') {
      throw new AppError('Only users with role "agent" can have locations assigned', 400);
    }

    // Validate all locations exist before updating
    if (data.assignedLocationIds.length > 0) {
      const { invalid } = await locationAssignmentService.validateLocationsExist(data.assignedLocationIds, verifiedConnection);

      if (invalid.length > 0) {
        const reasons = invalid.map(i => `${i.locationId}: ${i.reason}`).join('; ');
        throw new AppError(
          `Invalid locations provided: ${reasons}`,
          400
        );
      }
    }

    // Get current assigned locations
    const currentLocations = await locationAssignmentService.getAgentLocations(userId, verifiedConnection);
    const currentLocationIds = currentLocations.map(loc => loc._id.toString());

    // Find locations to remove (in current but not in new)
    const locationsToRemove = currentLocationIds.filter(
      id => !data.assignedLocationIds!.includes(id)
    );

    // Find locations to add (in new but not in current)
    const locationsToAdd = data.assignedLocationIds.filter(
      id => !currentLocationIds.includes(id)
    );

    // Remove locations
    for (const locationId of locationsToRemove) {
      await locationAssignmentService.unassignLocationFromAgent(locationId, verifiedConnection);
    }

    // Add locations (validation already done above)
    if (locationsToAdd.length > 0) {
      await locationAssignmentService.assignLocationsToAgent(userId, locationsToAdd, verifiedConnection);
    }
  }

  await user.save();

  // Fetch user with populated location data
  const updatedUser = await UserModel.findById(user._id)
    .populate('defaultLocation', 'locationName locality address city state locationType')
    .lean();

  return toUserResponse(updatedUser || user);
};

/**
 * Delete user (soft delete)
 */
export const deleteUser = async (userId: string, verifiedConnection?: mongoose.Connection): Promise<void> => {
  const UserModel = getUserModel(verifiedConnection);
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const queryBuilder = new QueryBuilderService();
  const user = await UserModel.findOne(queryBuilder.combineQueries(
    { _id: userObjectId },
    queryBuilder.excludeDeleted({})
  ));

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Soft delete - ensure both fields are set
  // Also deactivate user when soft deleted
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.isActive = false;

  // Mark fields as modified to ensure they're saved
  user.markModified('isDeleted');
  user.markModified('deletedAt');
  user.markModified('isActive');

  await user.save();

  // Verify deletion was successful
  const verifyUser = await UserModel.findById(userObjectId);
  if (verifyUser && !verifyUser.isDeleted) {
    throw new AppError('Failed to delete user. Please try again.', 500);
  }
};

/**
 * Get deleted users
 */
export const getDeletedUsers = async (params: UserListParams & {
  startDate?: string;
  endDate?: string;
} = {}, verifiedConnection?: mongoose.Connection): Promise<UserListResponse> => {
  const ProjectModel = getProjectModel(verifiedConnection);
  const paginationService = new PaginationService();
  const validatedPage = paginationService.validatePage(params.page, 1);
  const validatedLimit = paginationService.validateLimit(params.limit, PAGINATION.MAX_LIMIT, PAGINATION.DEFAULT_LIMIT);
  const skip = paginationService.calculateSkip(validatedPage, validatedLimit);

  // Build query for deleted users - must have isDeleted: true and deletedAt set
  const query: Record<string, unknown> = {
    isDeleted: true,
    deletedAt: { $exists: true, $ne: null }, // Ensure deletedAt is set
  };

  // Handle search - use regex for deleted users since text search might not work well with isDeleted filter
  if (params.search) {
    const searchRegex = { $regex: params.search, $options: 'i' };
    query.$or = [
      { email: searchRegex },
      { name: searchRegex },
    ];
  }

  if (params.role) {
    query.role = params.role;
  }

  // Handle date range filtering on deletedAt
  if (params.startDate || params.endDate) {
    const deletedAtQuery: Record<string, unknown> = {
      $exists: true,
      $ne: null,
    };
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      startDate.setHours(0, 0, 0, 0);
      deletedAtQuery.$gte = startDate;
    }
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      deletedAtQuery.$lte = endDate;
    }
    query.deletedAt = deletedAtQuery;
  }

  // Get User model from verified connection to ensure same connection instance
  const UserModel = getUserModel(verifiedConnection);

  // Get users and total count
  const [users, total] = await Promise.all([
    UserModel.find(query)
      .select('-password')
      .sort({ deletedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(validatedLimit)
      .lean(),
    UserModel.countDocuments(query),
  ]);

  // Add collection count for each user
  const usersWithCollectionCount = await Promise.all(
    users.map(async (user) => {
      const userResponse = toUserResponse(user as Record<string, unknown>);
      const userObjectId = user._id;

      // Count collections for this user
      const collectionCount = await ProjectModel.countDocuments({
        $or: [
          { userId: userObjectId, isDeleted: { $ne: true }, deletedAt: { $exists: false } },
          { collectedBy: userObjectId, isDeleted: { $ne: true }, deletedAt: { $exists: false } }
        ]
      });

      return {
        ...userResponse,
        collectionCount,
      };
    })
  );

  return {
    users: usersWithCollectionCount,
    total,
    page: validatedPage,
    limit: validatedLimit,
    totalPages: paginationService.calculateTotalPages(total, validatedLimit),
  };
};

/**
 * Restore deleted user
 */
export const restoreUser = async (userId: string, verifiedConnection?: mongoose.Connection): Promise<IUserResponse> => {
  const UserModel = getUserModel(verifiedConnection);
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const user = await UserModel.findOne({
    _id: userObjectId,
    isDeleted: true,
  });

  if (!user) {
    throw new AppError('Deleted user not found', 404);
  }

  user.isDeleted = false;
  user.deletedAt = undefined;

  // Mark fields as modified to ensure they're saved
  user.markModified('isDeleted');
  if (user.deletedAt !== undefined) {
    user.markModified('deletedAt');
  }

  await user.save();

  return toUserResponse(user);
};

/**
 * Permanently delete user
 */
export const permanentlyDeleteUser = async (userId: string, verifiedConnection?: mongoose.Connection): Promise<void> => {
  const UserModel = getUserModel(verifiedConnection);
  const ProjectModel = getProjectModel(verifiedConnection);
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const user = await UserModel.findOne({
    _id: userObjectId,
    isDeleted: true,
  });

  if (!user) {
    throw new AppError('Deleted user not found', 404);
  }

  // Check if user has any collections
  const collectionCount = await ProjectModel.countDocuments({
    $or: [
      { userId: userObjectId, isDeleted: { $ne: true }, deletedAt: { $exists: false } },
      { collectedBy: userObjectId, isDeleted: { $ne: true }, deletedAt: { $exists: false } }
    ]
  });

  if (collectionCount > 0) {
    throw new AppError(
      `Cannot permanently delete user with collections. Users with collections can only be soft deleted or deactivated.`,
      400
    );
  }

  await UserModel.deleteOne({ _id: userObjectId });
};

export const getUserStats = async (requesterRole?: string, verifiedConnection?: mongoose.Connection): Promise<{
  total: number;
  active: number;
  inactive: number;
  admins?: number;
  agents?: number;
  users?: number; // Regular users count
  recent: number; // Users created in last 7 days
}> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // For agents, only show 'user' role statistics
  const isAgent = requesterRole === 'agent';
  const queryBuilder = new QueryBuilderService();
  const baseQuery = queryBuilder.excludeDeleted({});

  // Use verified connection if provided, otherwise use default
  const _connection = verifiedConnection || mongoose.connection;
  const UserModel = getUserModel(verifiedConnection);

  if (isAgent) {
    // Agents can only see 'user' role statistics
    const userRoleQuery = { ...baseQuery, role: 'user' };

    const [total, active, inactive, recent] = await Promise.all([
      UserModel.countDocuments(userRoleQuery),
      UserModel.countDocuments({ ...userRoleQuery, isActive: true }),
      UserModel.countDocuments({ ...userRoleQuery, isActive: false }),
      UserModel.countDocuments({ ...userRoleQuery, createdAt: { $gte: sevenDaysAgo } }),
    ]);

    return {
      total,
      active,
      inactive,
      users: total,
      recent,
    };
  }

  // For admin/super_admin, show all statistics
  const [total, active, inactive, admins, agents, users, recent] = await Promise.all([
    UserModel.countDocuments(baseQuery),
    UserModel.countDocuments({ ...baseQuery, isActive: true }),
    UserModel.countDocuments({ ...baseQuery, isActive: false }),
    UserModel.countDocuments({ ...baseQuery, role: 'admin' }),
    UserModel.countDocuments({ ...baseQuery, role: 'agent' }),
    UserModel.countDocuments({ ...baseQuery, role: 'user' }),
    UserModel.countDocuments({ ...baseQuery, createdAt: { $gte: sevenDaysAgo } }),
  ]);

  return {
    total,
    active,
    inactive,
    admins,
    agents,
    users,
    recent,
  };
};

export const userAdminService = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getDeletedUsers,
  restoreUser,
  permanentlyDeleteUser,
  getUserStats,
};

