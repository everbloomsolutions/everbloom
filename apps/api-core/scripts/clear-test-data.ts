/**
 * Clear Test Data Script
 * 
 * This script clears all collections (including those with receipts) and all locations
 * from the database for testing purposes.
 * 
 * Usage:
 *   npm run clear-test-data
 *   or
 *   CLEAR_CONFIRM=true npm run clear-test-data
 * 
 * WARNING: This will permanently delete all data!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Project } from '../src/modules/project/project.model';
import { Location } from '../src/modules/location/location.model';
import { Receipt } from '../src/modules/receipt/receipt.model';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Clear all collections and locations from database
 */
async function clearTestData() {
  try {
    console.log('🔌 Connecting to database...');
    
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to database');

    // Confirm before proceeding
    console.log('\n⚠️  WARNING: This will delete ALL collections and locations!');
    console.log('⚠️  This includes collections with receipts!');
    console.log('⚠️  This action cannot be undone!\n');

    // In non-interactive mode, you can set CLEAR_CONFIRM=true to skip confirmation
    if (process.env.CLEAR_CONFIRM !== 'true') {
      console.log('To proceed, set CLEAR_CONFIRM=true environment variable');
      console.log('Example: CLEAR_CONFIRM=true npm run clear-test-data\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('🗑️  Starting cleanup...\n');

    // Delete all projects/collections (hard delete, regardless of receipt status or isDeleted flag)
    const projectsResult = await Project.deleteMany({});
    console.log(`✅ Deleted ${projectsResult.deletedCount} collection(s)`);

    // Delete all locations (hard delete, regardless of isDeleted flag)
    const locationsResult = await Location.deleteMany({});
    console.log(`✅ Deleted ${locationsResult.deletedCount} location(s)`);

    // Delete all receipts
    const receiptsResult = await Receipt.deleteMany({});
    console.log(`✅ Deleted ${receiptsResult.deletedCount} receipt(s)`);

    console.log('\n✨ Cleanup completed successfully!');
    console.log(`   - Collections: ${projectsResult.deletedCount}`);
    console.log(`   - Locations: ${locationsResult.deletedCount}`);
    console.log(`   - Receipts: ${receiptsResult.deletedCount}`);

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the script
clearTestData();

