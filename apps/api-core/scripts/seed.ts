import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';
import { logger } from '../src/core/middleware/logger';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedUsers = async (): Promise<void> => {
  try {
    // Connect to database
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB for seeding');

    // Clear existing users (optional - comment out if you want to keep existing data)
    await User.deleteMany({});
    logger.info('Cleared existing users');

    // Create permanent admin user for testing
    const adminUser = await User.create({
      email: 'admin@everbloom.com',
      password: 'Admin@123',
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    });
    logger.info(`Created admin user: ${adminUser.email}`);

    // Create regular user
    const regularUser = await User.create({
      email: 'user@example.com',
      password: 'user123',
      name: 'Regular User',
      role: 'user',
      isActive: true,
    });
    logger.info(`Created regular user: ${regularUser.email}`);

    logger.info('Seeding completed successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedUsers();
