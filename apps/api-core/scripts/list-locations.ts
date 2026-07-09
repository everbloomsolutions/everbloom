#!/usr/bin/env node

/**
 * List Locations Script
 *
 * This script lists all locations in the database, including deleted ones.
 *
 * Usage:
 *   npm run list-locations
 *   or
 *   tsx scripts/list-locations.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Location } from '../src/modules/location/location.model';
import { User as _User } from '../src/modules/user/user.model';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * List all locations in the database
 */
async function listLocations(): Promise<void> {
  try {
    console.log('🔌 Connecting to database...');

    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to database\n');

    // Get counts
    const totalCount = await Location.countDocuments({});
    const activeCount = await Location.countDocuments({ isDeleted: false });
    const deletedCount = await Location.countDocuments({ isDeleted: true });

    console.log('📊 Location Statistics:');
    console.log('─'.repeat(60));
    console.log(`   Total locations: ${totalCount}`);
    console.log(`   Active locations: ${activeCount}`);
    console.log(`   Deleted locations: ${deletedCount}`);
    console.log('');

    if (totalCount === 0) {
      console.log('⚠️  No locations found in the database.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get all locations (including deleted)
    const allLocations = await Location.find({})
      .sort({ createdAt: -1 })
      .lean();

    console.log('📍 All Locations:');
    console.log('═'.repeat(100));

    allLocations.forEach((location, index) => {
      const isDeleted = location.isDeleted || false;
      const status = isDeleted ? '❌ DELETED' : '✅ ACTIVE';

      console.log(`\n${index + 1}. ${location.locationName || 'Unnamed Location'} [${status}]`);
      console.log(`   ID: ${location._id}`);
      console.log(`   Type: ${location.locationType || 'N/A'}`);
      console.log(`   Address: ${location.address || 'N/A'}`);
      if (location.city) console.log(`   City: ${location.city}`);
      if (location.state) console.log(`   State: ${location.state}`);
      if (location.zipCode) console.log(`   ZIP: ${location.zipCode}`);
      console.log(`   Active: ${location.isActive !== false ? 'Yes' : 'No'}`);
      console.log(`   Usage Count: ${location.usageCount || 0}`);

      if (location.assignedToAgent) {
        const agentId = typeof location.assignedToAgent === 'object' && '_id' in location.assignedToAgent
          ? (location.assignedToAgent as { _id: unknown })._id
          : location.assignedToAgent;
        console.log(`   Assigned to Agent ID: ${agentId}`);
      } else {
        console.log(`   Assigned to Agent: None (Unassigned)`);
      }

      if (location.createdBy) {
        const creatorId = typeof location.createdBy === 'object' && '_id' in location.createdBy
          ? (location.createdBy as { _id: unknown })._id
          : location.createdBy;
        console.log(`   Created by User ID: ${creatorId}`);
      }

      if (location.createdAt) {
        console.log(`   Created: ${new Date(location.createdAt).toLocaleString()}`);
      }

      if (location.deletedAt) {
        console.log(`   Deleted: ${new Date(location.deletedAt).toLocaleString()}`);
      }

      if (location.tags && Array.isArray(location.tags) && location.tags.length > 0) {
        console.log(`   Tags: ${location.tags.join(', ')}`);
      }

      if (location.notes) {
        const notesPreview = location.notes.length > 50
          ? location.notes.substring(0, 50) + '...'
          : location.notes;
        console.log(`   Notes: ${notesPreview}`);
      }
    });

    console.log('\n' + '═'.repeat(100));
    console.log(`\n✨ Listed ${allLocations.length} location(s)\n`);

    // Show only active locations summary
    const activeLocations = allLocations.filter(loc => !loc.isDeleted);
    if (activeLocations.length > 0) {
      console.log('📋 Active Locations Summary:');
      console.log('─'.repeat(60));
      activeLocations.forEach((location, index) => {
        console.log(`${index + 1}. ${location.locationName} (${location.locationType}) - ${location.address}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error listing locations:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run the script
listLocations();
