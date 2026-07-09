import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must not exceed 255 characters'),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),
  
  role: z.enum(['user', 'agent', 'admin', 'super_admin'], {
    errorMap: () => ({ message: 'Role must be one of: user, agent, admin, or super_admin' }),
  }).default('agent'),
  
  isActive: z.boolean().default(true),
  
  defaultLocationId: z.string().optional(),
  
  assignedLocationIds: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // Require defaultLocationId for 'user' role
    if (data.role === 'user') {
      return !!data.defaultLocationId;
    }
    return true;
  },
  {
    message: 'Default location is required for users',
    path: ['defaultLocationId'],
  }
).refine(
  (data) => {
    // Require assignedLocationIds for 'agent' role
    if (data.role === 'agent') {
      return !!data.assignedLocationIds && data.assignedLocationIds.length > 0;
    }
    return true;
  },
  {
    message: 'At least one location must be assigned to agents',
    path: ['assignedLocationIds'],
  }
);

export const updateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must not exceed 255 characters')
    .optional(),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters')
    .optional(),
  
  role: z.enum(['user', 'agent', 'admin', 'super_admin']).optional(),
  
  isActive: z.boolean().optional(),
  
  defaultLocationId: z.string().optional(),
  
  assignedLocationIds: z.array(z.string()).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Schema for user status toggle endpoint
 * PATCH /api/v1/admin/users/:id/status
 */
export const toggleUserStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive is required',
    invalid_type_error: 'isActive must be a boolean',
  }),
});
