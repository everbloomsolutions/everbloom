import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
  type: z.enum(['info', 'success', 'warning', 'error', 'inquiry']).optional().default('info'),
  link: z.string().url('Invalid URL').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

export const notificationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  isRead: z.string().transform((val) => val === 'true').optional(),
  type: z.enum(['info', 'success', 'warning', 'error', 'inquiry']).optional(),
});

