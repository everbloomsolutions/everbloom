/**
 * Clear Locations and Collections Data Script
 * 
 * This script clears all locations and collections (projects) from the database.
 * 
 * Usage:
 *   npm run clear-locations-collections
 *   or
 *   CLEAR_CONFIRM=true npm run clear-locations-collections
 * 
 * WARNING: This will permanently delete all locations and collections data!
 * This action cannot be undone!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Project } from '../src/modules/project/project.model';
import { Location } from '../src/modules/location/location.model';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Clear all locations and collections from database
 */
async function clearLocationsAndCollections() {
  try {
    console.log('🔌 Connecting to database...');
    
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to database');

    // Get counts before deletion
    const locationsCount = await Location.countDocuments({});
    const collectionsCount = await Project.countDocuments({});
    
    console.log('\n📊 Current data:');
    console.log(`   - Locations: ${locationsCount}`);
    console.log(`   - Collections: ${collectionsCount}`);

    // Confirm before proceeding
    console.log('\n⚠️  WARNING: This will delete ALL locations and collections!');
    console.log('⚠️  This includes:');
    console.log('   - All locations (active and deleted)');
    console.log('   - All collections/projects (all statuses)');
    console.log('⚠️  This action cannot be undone!\n');

    // In non-interactive mode, you can set CLEAR_CONFIRM=true to skip confirmation
    if (process.env.CLEAR_CONFIRM !== 'true') {
      console.log('To proceed, set CLEAR_CONFIRM=true environment variable');
      console.log('Example: CLEAR_CONFIRM=true npm run clear-locations-collections\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('🗑️  Starting cleanup...\n');

    // Delete all projects/collections (hard delete, regardless of status or isDeleted flag)
    const projectsResult = await Project.deleteMany({});
    console.log(`✅ Deleted ${projectsResult.deletedCount} collection(s)`);

    // Delete all locations (hard delete, regardless of isDeleted flag)
    const locationsResult = await Location.deleteMany({});
    console.log(`✅ Deleted ${locationsResult.deletedCount} location(s)`);

    console.log('\n✨ Cleanup completed successfully!');
    console.log(`   - Collections deleted: ${projectsResult.deletedCount}`);
    console.log(`   - Locations deleted: ${locationsResult.deletedCount}`);

    // Verify deletion
    const remainingLocations = await Location.countDocuments({});
    const remainingCollections = await Project.countDocuments({});
    
    if (remainingLocations === 0 && remainingCollections === 0) {
      console.log('\n✅ Verification: All locations and collections have been cleared.');
    } else {
      console.log('\n⚠️  Warning: Some data may remain:');
      if (remainingLocations > 0) {
        console.log(`   - ${remainingLocations} location(s) still exist`);
      }
      if (remainingCollections > 0) {
        console.log(`   - ${remainingCollections} collection(s) still exist`);
      }
    }

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
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
clearLocationsAndCollections();
