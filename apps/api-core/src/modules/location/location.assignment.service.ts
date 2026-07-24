import { Types } from 'mongoose';
import { Location, ILocation } from './location.model';
import { User, IUser } from '../user/user.model';
import { AppError } from '../../common/exceptions/app-error';
import { ValidationService } from '../../common/validation/validation.service';
import mongoose, { Model } from 'mongoose';

/**
 * Get User model from the default Mongoose connection
 * Note: This is used in function-based services that can't inject DatabaseService
 * Connection readiness should be verified by the calling NestJS service before calling functions that use this
 *
 * @param verifiedConnection - Optional verified connection instance from DatabaseService
 */
const getUserModel = (verifiedConnection?: mongoose.Connection): Model<IUser> => {
  // If a verified connection is provided, use it (this ensures we use the same connection that was verified)
  const connection = verifiedConnection || mongoose.connection;

  // Get or create the model from the connection
  if (connection.models.User) {
    return connection.models.User as Model<IUser>;
  }
  // Fallback to the exported User model (uses default connection)
  return User as Model<IUser>;
};

/**
 * Get Location model from the verified connection
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
 * Assign location as default to user (role 'user' only)
 */
export const assignLocationToUser = async (
  userId: string,
  locationId: string
, verifiedConnection?: mongoose.Connection): Promise<IUser> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');

  // Validate user exists and has role 'user'
  const user = await UserModel.findById(userObjectId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.role !== 'user') {
    throw new AppError('Only users with role "user" can have a default location', 400);
  }

  // Validate location exists and is not deleted (same criteria as list/search)
  const location = await LocationModel.findOne({
    _id: locationObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });
  if (!location) {
    throw new AppError('Location not found', 404);
  }

  // Check if location is already assigned to another user as default location
  const existingUser = await UserModel.findOne({
    defaultLocation: locationObjectId,
    _id: { $ne: userObjectId },
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });

  if (existingUser) {
    throw new AppError(
      `Location is already assigned to another user (${existingUser.email || existingUser.name || 'Unknown'})`,
      400
    );
  }

  // Assign location to user (replaces existing if any)
  user.defaultLocation = locationObjectId;
  await user.save();

  return user;
};

/**
 * Remove default location from user
 */
export const removeLocationFromUser = async (userId: string, verifiedConnection?: mongoose.Connection): Promise<IUser> => {
  const UserModel = getUserModel(verifiedConnection);
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const user = await UserModel.findById(userObjectId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.defaultLocation = undefined;
  await user.save();

  return user;
};

/**
 * Assign location to agent (unassigns from previous agent if needed)
 */
export const assignLocationToAgent = async (
  agentId: string,
  locationId: string
, verifiedConnection?: mongoose.Connection): Promise<ILocation> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const agentObjectId = validationService.validateObjectId(agentId, 'agentId');
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');

  // Validate agent exists and has role 'agent'
  const agent = await UserModel.findById(agentObjectId);
  if (!agent) {
    throw new AppError('Agent not found', 404);
  }
  if (agent.role !== 'agent') {
    throw new AppError('Only users with role "agent" can have locations assigned', 400);
  }

  // Validate location exists and is not deleted (same criteria as list/search)
  const location = await LocationModel.findOne({
    _id: locationObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });
  if (!location) {
    throw new AppError('Location not found', 404);
  }

  // If location is already assigned to another agent, unassign it first
  if (location.assignedToAgent && !location.assignedToAgent.equals(agentObjectId)) {
    // Location is assigned to a different agent - this is allowed, we'll reassign
  }

  // Assign location to agent
  location.assignedToAgent = agentObjectId;
  await location.save();

  return location;
};

/**
 * Unassign location from agent
 */
export const unassignLocationFromAgent = async (locationId: string, verifiedConnection?: mongoose.Connection): Promise<ILocation> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');

  const location = await LocationModel.findOne({
    _id: locationObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });
  if (!location) {
    throw new AppError('Location not found', 404);
  }

  location.assignedToAgent = undefined;
  await location.save();

  return location;
};

/**
 * Validate that all locations exist and are not deleted
 */
export const validateLocationsExist = async (
  locationIds: string[]
, verifiedConnection?: mongoose.Connection): Promise<{ valid: string[]; invalid: Array<{ locationId: string; reason: string }> }> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const valid: string[] = [];
  const invalid: Array<{ locationId: string; reason: string }> = [];

  const validationService = new ValidationService();
  for (const locationId of locationIds) {
    try {
      const locationObjectId = validationService.validateObjectId(locationId, 'locationId');
      const location = await LocationModel.findOne({
        _id: locationObjectId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      });

      if (!location) {
        invalid.push({ locationId, reason: 'Location not found or has been deleted' });
      } else {
        valid.push(locationId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid location ID format';
      invalid.push({ locationId, reason: errorMessage });
    }
  }

  return { valid, invalid };
};

/**
 * Bulk assign multiple locations to agent
 * Throws an error if any location fails to assign
 */
export const assignLocationsToAgent = async (
  agentId: string,
  locationIds: string[]
, verifiedConnection?: mongoose.Connection): Promise<{ success: number; failed: number; results: Array<{ locationId: string; success: boolean; error?: string }> }> => {
  const UserModel = getUserModel(verifiedConnection);
  const validationService = new ValidationService();
  const agentObjectId = validationService.validateObjectId(agentId, 'agentId');

  // Validate agent exists and has role 'agent'
  const agent = await UserModel.findById(agentObjectId);
  if (!agent) {
    throw new AppError('Agent not found', 404);
  }
  if (agent.role !== 'agent') {
    throw new AppError('Only users with role "agent" can have locations assigned', 400);
  }

  // Validate all locations exist before attempting assignment
  const { valid, invalid } = await validateLocationsExist(locationIds, verifiedConnection);

  if (invalid.length > 0) {
    const reasons = invalid.map(i => `${i.locationId}: ${i.reason}`).join('; ');
    throw new AppError(
      `Invalid locations provided: ${reasons}`,
      400
    );
  }

  const results: Array<{ locationId: string; success: boolean; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const locationId of valid) {
    try {
      await assignLocationToAgent(agentId, locationId, verifiedConnection);
      results.push({ locationId, success: true });
      success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign location';
      results.push({ locationId, success: false, error: errorMessage });
      failed++;
    }
  }

  // If any assignment failed, throw an error
  if (failed > 0) {
    const failedIds = results.filter(r => !r.success).map(r => r.locationId).join(', ');
    throw new AppError(
      `Failed to assign ${failed} location(s): ${failedIds}`,
      400
    );
  }

  return { success, failed, results };
};

/**
 * Get user's default location
 */
export const getUserDefaultLocation = async (userId: string, verifiedConnection?: mongoose.Connection): Promise<ILocation | null> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const user = await UserModel.findById(userObjectId).populate('defaultLocation');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.defaultLocation) {
    return null;
  }

  // If populated, return it; otherwise fetch it
  if (user.defaultLocation instanceof Types.ObjectId) {
    const location = await LocationModel.findOne({
      _id: user.defaultLocation,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    });
    return location;
  }

  return user.defaultLocation as unknown as ILocation;
};

/**
 * Get all locations assigned to an agent
 */
export const getAgentLocations = async (agentId: string, verifiedConnection?: mongoose.Connection): Promise<ILocation[]> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const agentObjectId = validationService.validateObjectId(agentId, 'agentId');

  // Validate agent exists and has role 'agent'
  const agent = await UserModel.findById(agentObjectId);
  if (!agent) {
    throw new AppError('Agent not found', 404);
  }
  if (agent.role !== 'agent') {
    throw new AppError('Only users with role "agent" can have locations assigned', 400);
  }

  const locations = await LocationModel.find({
    assignedToAgent: agentObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  }).populate('assignedToAgent', 'name email');

  return locations;
};

/**
 * Get users with role 'user' who don't have a default location
 */
export const getUsersWithoutDefaultLocation = async (verifiedConnection?: mongoose.Connection): Promise<IUser[]> => {
  const UserModel = getUserModel(verifiedConnection);
  const users = await UserModel.find({
    role: 'user',
    $or: [
      { defaultLocation: { $exists: false } },
      { defaultLocation: null },
    ],
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  })
    .select('name email role isActive createdAt')
    .sort({ createdAt: -1 });

  return users;
};

/**
 * Get agents with count of assigned locations
 */
export const getAgentsWithLocationCount = async (verifiedConnection?: mongoose.Connection): Promise<Array<{ agent: IUser; locationCount: number }>> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  const agents = await UserModel.find({
    role: 'agent',
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  })
    .select('name email role isActive createdAt')
    .sort({ createdAt: -1 });

  const agentsWithCount = await Promise.all(
    agents.map(async (agent) => {
      const locationCount = await LocationModel.countDocuments({
        assignedToAgent: agent._id,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      });
      return { agent, locationCount };
    })
  );

  return agentsWithCount;
};

/**
 * Transfer location from one agent to another (Admin only)
 * Transfers a location assignment from one agent to another
 */
export const transferLocationToAgent = async (
  locationId: string,
  newAgentId: string,
  transferredBy: string
, verifiedConnection?: mongoose.Connection): Promise<ILocation> => {
  const UserModel = getUserModel(verifiedConnection);
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');
  const newAgentObjectId = validationService.validateObjectId(newAgentId, 'newAgentId');
  validationService.validateObjectId(transferredBy, 'transferredBy');

  // Validate location exists and is not deleted (same criteria as list/search)
  const location = await LocationModel.findOne({
    _id: locationObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });
  if (!location) {
    throw new AppError('Location not found', 404);
  }

  // Validate new agent exists and has role 'agent'
  const newAgent = await UserModel.findById(newAgentObjectId);
  if (!newAgent) {
    throw new AppError('New agent not found', 404);
  }
  if (newAgent.role !== 'agent') {
    throw new AppError('Target user must have role "agent"', 400);
  }

  // Get old agent info for audit trail
  const oldAgentId = location.assignedToAgent;

  // Check if location is already assigned to the new agent
  if (oldAgentId && oldAgentId.equals(newAgentObjectId)) {
    throw new AppError('Location is already assigned to this agent', 400);
  }

  // Get old agent details if exists (for audit/logging purposes)
  if (oldAgentId) {
    await UserModel.findById(oldAgentId).select('name email').lean();
  }

  // Transfer location to new agent
  location.assignedToAgent = newAgentObjectId;
  await location.save();

  // Log transfer (could be extended to add audit trail to location model if needed)
  // For now, the assignment change itself serves as the audit trail

  return location;
};

/**
 * Get users with their default locations (for admin assignment UI)
 */
export const getUsersWithLocations = async (filters?: {
  search?: string;
  page?: number;
  limit?: number;
}, verifiedConnection?: mongoose.Connection): Promise<{
  users: IUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  const query: Record<string, unknown> = {
    role: 'user',
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  };

  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  // Get User model from verified connection to ensure same connection instance as NestJS
  const UserModel = getUserModel(verifiedConnection);

  const [users, total] = await Promise.all([
    UserModel.find(query)
      .populate('defaultLocation', 'locationName locality address city state locationType')
      .select('name email role isActive defaultLocation createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(query),
  ]);

  return {
    users: users as unknown as IUser[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get agents with their assigned locations (for admin assignment UI)
 */
export const getAgentsWithLocations = async (filters?: {
  search?: string;
  page?: number;
  limit?: number;
}, verifiedConnection?: mongoose.Connection): Promise<{
  agents: Array<IUser & { locations: ILocation[]; locationCount: number }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  const query: Record<string, unknown> = {
    role: 'agent',
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  };

  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  // Get User model from verified connection to ensure same connection instance as NestJS
  const UserModel = getUserModel(verifiedConnection);

  const [agents, total] = await Promise.all([
    UserModel.find(query)
      .select('name email role isActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(query),
  ]);

  // Get Location model from verified connection to ensure same connection instance
  const LocationModel = getLocationModel(verifiedConnection);

  // Get locations for each agent
  const agentsWithLocations = await Promise.all(
    agents.map(async (agent) => {
      const locations = await LocationModel.find({
        assignedToAgent: agent._id,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      })
        .select('locationName address city state locationType')
        .lean();

      return {
        ...agent,
        locations,
        locationCount: locations.length,
      };
    })
  );

  return {
    agents: agentsWithLocations as unknown as Array<IUser & { locations: ILocation[]; locationCount: number }>,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Transfer location to another agent (wrapper for transferLocationToAgent)
 */
export const transferLocation = async (
  locationId: string,
  newAgentId: string,
  transferredBy?: string,
  verifiedConnection?: mongoose.Connection): Promise<ILocation> => {
  return transferLocationToAgent(locationId, newAgentId, transferredBy || 'system', verifiedConnection);
};
