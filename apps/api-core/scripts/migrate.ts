import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../src/core/middleware/logger';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Migration script template
 * Add your migration logic here
 */
const runMigrations = async (): Promise<void> => {
  try {
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB for migrations');

    // Example: Add indexes
    const userCollection = mongoose.connection.collection('users');
    
    // Create indexes if they don't exist
    await userCollection.createIndex({ email: 1 }, { unique: true });
    await userCollection.createIndex({ role: 1 });
    await userCollection.createIndex({ isActive: 1 });
    
    logger.info('Created indexes on users collection');

    // Add your migration logic here
    // Example: Update existing documents
    // await User.updateMany({}, { $set: { newField: 'defaultValue' } });

    logger.info('Migrations completed successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runMigrations();
