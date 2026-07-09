import { Types } from 'mongoose';

/**
 * Generate mock user data
 */
export const mockUser = (overrides?: Partial<{
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin' | 'agent';
  isActive: boolean;
  onboardingCompleted: boolean;
}>): {
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin' | 'agent';
  isActive: boolean;
  onboardingCompleted: boolean;
} => {
  return {
    email: overrides?.email || `mock${Date.now()}@example.com`,
    name: overrides?.name || 'Mock User',
    password: overrides?.password || 'Password123',
    role: overrides?.role || 'user',
    isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
    onboardingCompleted: overrides?.onboardingCompleted !== undefined ? overrides.onboardingCompleted : false,
  };
};

/**
 * Generate mock project data
 */
export const mockProject = (userId?: string, overrides?: Partial<{
  serviceType: 'recycling' | 'cctv' | 'access-control' | 'fire-safety' | 'networking' | 'home-automation' | 'other';
  title: string;
  description: string;
  status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}>): {
  userId: string;
  serviceType: 'recycling' | 'cctv' | 'access-control' | 'fire-safety' | 'networking' | 'home-automation' | 'other';
  title: string;
  description: string;
  status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
} => {
  return {
    userId: userId || new Types.ObjectId().toString(),
    serviceType: overrides?.serviceType || 'recycling',
    title: overrides?.title || 'Mock Project',
    description: overrides?.description || 'Mock project description',
    status: overrides?.status || 'pending',
    priority: overrides?.priority,
  };
};

/**
 * Generate mock notification data
 */
export const mockNotification = (userId?: string, overrides?: Partial<{
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'inquiry';
  isRead: boolean;
  link: string;
}>): {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'inquiry';
  isRead: boolean;
  link?: string;
} => {
  return {
    userId: userId || new Types.ObjectId().toString(),
    title: overrides?.title || 'Mock Notification',
    message: overrides?.message || 'Mock notification message',
    type: overrides?.type || 'info',
    isRead: overrides?.isRead !== undefined ? overrides.isRead : false,
    link: overrides?.link,
  };
};

/**
 * Generate mock analytics event data
 */
export const mockAnalyticsEvent = (overrides?: Partial<{
  eventType: string;
  userId: string;
  sessionId: string;
  properties: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}>): {
  eventType: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
} => {
  return {
    eventType: overrides?.eventType || 'page_view',
    userId: overrides?.userId,
    sessionId: overrides?.sessionId || 'mock-session',
    properties: overrides?.properties || {},
    ipAddress: overrides?.ipAddress || '127.0.0.1',
    userAgent: overrides?.userAgent || 'Mozilla/5.0',
  };
};

/**
 * Generate mock contact form data
 */
export const mockContactForm = (overrides?: Partial<{
  name: string;
  email: string;
  subject: string;
  message: string;
  phoneNumber: string;
}>): {
  name: string;
  email: string;
  subject: string;
  message: string;
  phoneNumber?: string;
} => {
  return {
    name: overrides?.name || 'Mock Contact',
    email: overrides?.email || 'contact@example.com',
    subject: overrides?.subject || 'Mock Subject',
    message: overrides?.message || 'Mock message content',
    phoneNumber: overrides?.phoneNumber,
  };
};

/**
 * Generate array of mock data
 */
export const mockUsers = (count: number): ReturnType<typeof mockUser>[] => {
  return Array.from({ length: count }, (_, i) => mockUser({ email: `user${i}@example.com`, name: `User ${i}` }));
};

export const mockProjects = (userId: string, count: number): ReturnType<typeof mockProject>[] => {
  return Array.from({ length: count }, (_, i) => mockProject(userId, { title: `Project ${i}` }));
};

export const mockNotifications = (userId: string, count: number): ReturnType<typeof mockNotification>[] => {
  return Array.from({ length: count }, (_, i) => mockNotification(userId, { title: `Notification ${i}` }));
};

