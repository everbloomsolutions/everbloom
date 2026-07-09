/**
 * Clear Locations and Collections Data in Production
 * 
 * This script clears all locations, collections (projects), and receipts from the database.
 * 
 * Usage:
 *   CLEAR_CONFIRM=true NODE_ENV=production tsx scripts/clear-locations-production.ts
 * 
 * WARNING: This will permanently delete all locations, collections, and receipts!
 * This action cannot be undone!
 * 
 * Safety checks:
 * - Requires CLEAR_CONFIRM=true environment variable
 * - Requires NODE_ENV=production
 * - Shows summary of data to be deleted
 * - Deletes in correct order: Receipts -> Collections -> Locations
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Location } from '../src/modules/location/location.model';
import { Project } from '../src/modules/project/project.model';
import { Receipt } from '../src/modules/receipt/receipt.model';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Clear all locations, collections, and receipts from database
 */
async function clearLocationsAndCollectionsProduction() {
  try {
    console.log('🔌 Connecting to database...');
    
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Safety check: Must be in production mode
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ ERROR: This script can only run in production mode!');
      console.error('   Set NODE_ENV=production to proceed');
      process.exit(1);
    }

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to database');

    // Get counts before deletion
    const totalLocations = await Location.countDocuments({});
    const activeLocations = await Location.countDocuments({ isDeleted: false });
    const deletedLocations = await Location.countDocuments({ isDeleted: true });
    
    const totalCollections = await Project.countDocuments({});
    const activeCollections = await Project.countDocuments({ isDeleted: false });
    const deletedCollections = await Project.countDocuments({ isDeleted: true });
    
    const totalReceipts = await Receipt.countDocuments({});
    
    console.log('\n📊 Current data:');
    console.log(`   - Total Locations: ${totalLocations}`);
    console.log(`     • Active: ${activeLocations}, Deleted: ${deletedLocations}`);
    console.log(`   - Total Collections: ${totalCollections}`);
    console.log(`     • Active: ${activeCollections}, Deleted: ${deletedCollections}`);
    console.log(`   - Total Receipts: ${totalReceipts}`);

    // Confirm before proceeding
    console.log('\n⚠️  WARNING: This will delete ALL data!');
    console.log('⚠️  This includes:');
    console.log('   - All locations (active and deleted)');
    console.log('   - All collections/projects (all statuses)');
    console.log('   - All receipts');
    console.log('   - All associated metadata');
    console.log('\n⚠️  Deletion order:');
    console.log('   1. Receipts (reference collections)');
    console.log('   2. Collections/Projects (reference locations)');
    console.log('   3. Locations');
    console.log('\n⚠️  This action cannot be undone!\n');

    // In non-interactive mode, you must set CLEAR_CONFIRM=true to skip confirmation
    if (process.env.CLEAR_CONFIRM !== 'true') {
      console.log('To proceed, set CLEAR_CONFIRM=true environment variable');
      console.log('Example: CLEAR_CONFIRM=true NODE_ENV=production tsx scripts/clear-locations-production.ts\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('🗑️  Starting cleanup...\n');

    // Step 1: Delete all receipts first (they reference collections)
    if (totalReceipts > 0) {
      console.log(`📝 Step 1: Deleting all ${totalReceipts} receipt(s)...`);
      const receiptsResult = await Receipt.deleteMany({});
      console.log(`✅ Deleted ${receiptsResult.deletedCount} receipt(s)`);
    } else {
      console.log('📝 Step 1: No receipts to delete, skipping...');
    }

    // Step 2: Delete all collections/projects (they reference locations)
    if (totalCollections > 0) {
      console.log(`\n🗑️  Step 2: Deleting all ${totalCollections} collection(s)...`);
      const collectionsResult = await Project.deleteMany({});
      console.log(`✅ Deleted ${collectionsResult.deletedCount} collection(s)`);
    } else {
      console.log('\n📝 Step 2: No collections to delete, skipping...');
    }

    // Step 3: Delete all locations
    if (totalLocations > 0) {
      console.log(`\n🗑️  Step 3: Deleting all ${totalLocations} location(s)...`);
      const locationsResult = await Location.deleteMany({});
      console.log(`✅ Deleted ${locationsResult.deletedCount} location(s)`);
    } else {
      console.log('\n📝 Step 3: No locations to delete, skipping...');
    }

    console.log('\n✨ Cleanup completed successfully!');
    console.log(`   - Receipts deleted: ${totalReceipts}`);
    console.log(`   - Collections deleted: ${totalCollections}`);
    console.log(`   - Locations deleted: ${totalLocations}`);

    // Verify deletion
    const remainingReceipts = await Receipt.countDocuments({});
    const remainingCollections = await Project.countDocuments({});
    const remainingLocations = await Location.countDocuments({});
    
    console.log('\n📊 Verification:');
    if (remainingReceipts === 0 && remainingCollections === 0 && remainingLocations === 0) {
      console.log('✅ All data has been cleared successfully.');
    } else {
      console.log('⚠️  Warning: Some data may remain:');
      if (remainingReceipts > 0) {
        console.log(`   - ${remainingReceipts} receipt(s) still exist`);
      }
      if (remainingCollections > 0) {
        console.log(`   - ${remainingCollections} collection(s) still exist`);
      }
      if (remainingLocations > 0) {
        console.log(`   - ${remainingLocations} location(s) still exist`);
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
clearLocationsAndCollectionsProduction();
