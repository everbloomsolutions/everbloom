import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  subject: z.string().optional(), // Subject is optional - default will be set in controller
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message is too long'),
});

