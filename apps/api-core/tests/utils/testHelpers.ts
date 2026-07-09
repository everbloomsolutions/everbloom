import mongoose from 'mongoose';
import * as authService from '../../src/modules/auth/auth.service';
import { User } from '../../src/modules/user/user.model';
import { Project } from '../../src/modules/project/project.model';
import { Notification } from '../../src/modules/notification/notification.model';
import { AnalyticsEvent } from '../../src/modules/analytics/analytics.model';
import { JwtService } from '../../src/common/services/jwt.service';
import testLogger from './testLogger';

export interface TestUser {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent';
  token: string;
  refreshToken: string;
}

/**
 * Create a test user and return user data with tokens
 */
export const createTestUser = async (data?: {
  email?: string;
  password?: string;
  name?: string;
  role?: 'user' | 'admin' | 'agent';
}): Promise<TestUser> => {
  const userData = {
    email: data?.email || `test${Date.now()}@example.com`,
    password: data?.password || 'Password123',
    name: data?.name || 'Test User',
  };

  const result = await authService.registerUser(userData);
  const userId = result.user._id.toString();

  // Update role if needed
  if (data?.role === 'admin' || data?.role === 'agent') {
    const user = await User.findById(userId);
    if (user) {
      user.role = data.role;
      await user.save();
    }
  }

  return {
    _id: userId,
    email: result.user.email,
    name: result.user.name || '',
    role: (data?.role || 'agent') as 'admin' | 'agent',
    token: result.token,
    refreshToken: result.refreshToken || '',
  };
};

/**
 * Generate auth token for a user
 */
export const generateAuthToken = (userId: string, email: string, role: string = 'user'): string => {
  const tokens = generateTokens(userId, email, role);
  return tokens.token;
};

/**
 * Create a test project
 */
export const createTestProject = async (userId: string, data?: {
  serviceType?: 'recycling' | 'cctv' | 'access-control' | 'fire-safety' | 'networking' | 'home-automation' | 'other';
  title?: string;
  description?: string;
  status?: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'in-progress' | 'completed';
  locationType?: 'residential-apartment' | 'residential-society' | 'residential-gated-community';
  locationName?: string;
  collectionItems?: Array<{
    materialType: 'mixed-plastic' | 'paper' | 'iron' | 'aluminium' | 'wood' | 'copper';
    weight: number;
    rate: number;
  }>;
}): Promise<typeof Project.prototype> => {
  const projectData: any = {
    userId: new mongoose.Types.ObjectId(userId),
    serviceType: data?.serviceType || 'recycling',
    title: data?.title || 'Test Project',
    description: data?.description || 'Test Description',
    status: data?.status || 'pending',
  };

  // Add collection-specific fields if serviceType is recycling
  if (data?.serviceType === 'recycling' || !data?.serviceType) {
    if (data?.locationType) {
      projectData.locationType = data.locationType;
    }
    if (data?.locationName) {
      projectData.locationName = data.locationName;
    }
    if (data?.collectionItems) {
      projectData.collectionItems = data.collectionItems;
    } else {
      // Default collection items for testing
      projectData.collectionItems = [
        { materialType: 'mixed-plastic', weight: 10, rate: 5 },
        { materialType: 'paper', weight: 5, rate: 3 },
      ];
    }
    projectData.gstRate = 18;
    projectData.collectionDate = new Date();
  }

  const project = new Project(projectData);
  return await project.save();
};

/**
 * Create a test notification
 */
export const createTestNotification = async (userId: string, data?: {
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'inquiry';
  isRead?: boolean;
}): Promise<typeof Notification.prototype> => {
  const notification = new Notification({
    user: new mongoose.Types.ObjectId(userId),
    title: data?.title || 'Test Notification',
    message: data?.message || 'Test message',
    type: data?.type || 'info',
    isRead: data?.isRead || false,
  });

  return await notification.save();
};

/**
 * Create a test analytics event
 */
export const createTestAnalyticsEvent = async (data?: {
  eventType?: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
}): Promise<typeof AnalyticsEvent.prototype> => {
  const event = new AnalyticsEvent({
    eventType: data?.eventType || 'page_view',
    userId: data?.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
    sessionId: data?.sessionId || 'test-session',
    properties: data?.properties || {},
  });

  return await event.save();
};

/**
 * Create multiple test users
 */
export const createTestUsers = async (count: number): Promise<TestUser[]> => {
  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `user${i}@example.com`,
      name: `User ${i}`,
    });
    users.push(user);
  }
  return users;
};

/**
 * Wait for a condition to be true (useful for async operations)
 */
export const waitFor = async (
  condition: () => Promise<boolean> | boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Condition not met within timeout');
};

/**
 * Test logging helpers
 */
interface TestContext {
  [key: string]: unknown;
}

/**
 * Log test start with context
 */
export const logTestStart = (testName: string, suite?: string, context?: TestContext): void => {
  testLogger.testStart(testName, suite, context);
};

/**
 * Log test completion
 */
export const logTestEnd = (
  testName: string,
  status: 'passed' | 'failed' | 'skipped',
  duration?: number,
  context?: TestContext
): void => {
  testLogger.testEnd(testName, status, duration, context);
};

/**
 * Log test error with context
 */
export const logTestError = (testName: string, error: Error | unknown, context?: TestContext): void => {
  testLogger.testError(testName, error, context);
};

/**
 * Log assertion result
 */
export const logTestAssertion = (description: string, passed: boolean, details?: TestContext): void => {
  testLogger.assertion(description, passed, details);
};

/**
 * Log test step
 */
export const logTestStep = (stepName: string, context?: TestContext): void => {
  testLogger.step(stepName, context);
};

