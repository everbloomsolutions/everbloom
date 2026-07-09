import mongoose from 'mongoose';
import { User } from '../../src/modules/user/user.model';
import { Project } from '../../src/modules/project/project.model';
import { Notification } from '../../src/modules/notification/notification.model';
import { AnalyticsEvent } from '../../src/modules/analytics/analytics.model';

/**
 * Clear all collections in the database
 */
export const clearAllCollections = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  const collectionNames = Object.keys(collections);

  for (const collectionName of collectionNames) {
    try {
      await collections[collectionName].deleteMany({});
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
};

/**
 * Drop all collections
 */
export const dropAllCollections = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  const collectionNames = Object.keys(collections);

  for (const collectionName of collectionNames) {
    try {
      await collections[collectionName].drop();
    } catch (error) {
      // Ignore errors if collection doesn't exist
    }
  }
};

/**
 * Get collection count
 */
export const getCollectionCount = async (collectionName: string): Promise<number> => {
  if (mongoose.connection.readyState !== 1) {
    return 0;
  }

  const collection = mongoose.connection.collection(collectionName);
  return await collection.countDocuments();
};

/**
 * Seed test database with sample data
 */
export const seedTestDatabase = async (): Promise<{
  users: typeof User.prototype[];
  projects: typeof Project.prototype[];
  notifications: typeof Notification.prototype[];
}> => {
  // Create test users
  const user1 = new User({
    email: 'seed1@example.com',
    password: 'Password123',
    name: 'Seed User 1',
    role: 'user',
  });
  await user1.save();

  const user2 = new User({
    email: 'seed2@example.com',
    password: 'Password123',
    name: 'Seed User 2',
    role: 'admin',
  });
  await user2.save();

  // Create test projects
  const project1 = new Project({
    userId: user1._id,
    serviceType: 'recycling',
    title: 'Seed Project 1',
    description: 'Seed description 1',
    status: 'pending',
  });
  await project1.save();

  const project2 = new Project({
    userId: user1._id,
    serviceType: 'cctv',
    title: 'Seed Project 2',
    description: 'Seed description 2',
    status: 'quoted',
  });
  await project2.save();

  // Create test notifications
  const notification1 = new Notification({
    user: user1._id,
    title: 'Seed Notification 1',
    message: 'Seed message 1',
    type: 'info',
  });
  await notification1.save();

  return {
    users: [user1, user2],
    projects: [project1, project2],
    notifications: [notification1],
  };
};

/**
 * Check if database is connected
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Wait for database connection
 */
export const waitForDatabaseConnection = async (timeout: number = 5000): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (isDatabaseConnected()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Database connection timeout');
};

