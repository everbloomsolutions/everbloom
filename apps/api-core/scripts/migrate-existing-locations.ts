/**
 * Migration script to extract and register existing locations from collections
 *
 * This script:
 * 1. Finds all unique location combinations from existing collections
 * 2. Creates Location documents for each unique location
 * 3. Optionally links collections to the created locations
 *
 * Usage:
 *   pnpm tsx scripts/migrate-existing-locations.ts [--link-collections]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../src/core/db/database';
import { Project } from '../src/modules/project/project.model';
import { Location } from '../src/modules/location/location.model';
import { logger } from '../src/core/middleware/logger';

// Load environment variables
const cwd = process.cwd();
const rootDir = path.resolve(cwd, '..');
const rootEnvPath = path.resolve(rootDir, '.env');
const backendEnvPath = path.resolve(cwd, '.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath });

interface LocationData {
  locationType: string;
  locationName: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  collections: mongoose.Types.ObjectId[];
}

/**
 * Extract unique locations from collections
 */
const extractUniqueLocations = async (): Promise<Map<string, LocationData>> => {
  const collections = await Project.find({
    serviceType: 'recycling',
    locationType: { $exists: true, $ne: null },
    locationName: { $exists: true, $ne: null },
    'location.address': { $exists: true, $ne: null },
  }).select('locationType locationName location collectionDate').lean();

  const locationMap = new Map<string, LocationData>();

  collections.forEach((col: any) => {
    // Create unique key from locationType + locationName + address
    const key = `${col.locationType}|${col.locationName}|${col.location?.address || ''}`.toLowerCase();

    if (!locationMap.has(key)) {
      locationMap.set(key, {
        locationType: col.locationType,
        locationName: col.locationName,
        address: col.location?.address || '',
        city: col.location?.city,
        state: col.location?.state,
        zipCode: col.location?.zipCode,
        coordinates: col.location?.coordinates,
        collections: [new mongoose.Types.ObjectId(col._id)],
      });
    } else {
      const existing = locationMap.get(key)!;
      existing.collections.push(new mongoose.Types.ObjectId(col._id));
    }
  });

  return locationMap;
};

/**
 * Create Location documents from extracted data
 */
const createLocations = async (
  locations: Map<string, LocationData>,
  linkCollections: boolean = false
): Promise<void> => {
  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const [_key, locationData] of locations.entries()) {
    try {
      // Check if location already exists
      const existing = await Location.findOne({
        locationType: locationData.locationType,
        locationName: locationData.locationName,
        address: locationData.address,
        isDeleted: false,
      });

      if (existing) {
        logger.info(`Location already exists: ${locationData.locationName}`);
        skipped++;

        // Link collections if requested
        if (linkCollections) {
          const result = await Project.updateMany(
            { _id: { $in: locationData.collections } },
            { locationId: existing._id }
          );
          linked += result.modifiedCount;
        }
        continue;
      }

      // Create new location
      // Use first collection's date as created date, or use system admin as creator
      const location = new Location({
        ...locationData,
        createdBy: new mongoose.Types.ObjectId('000000000000000000000000'), // System migration
        isActive: true,
        isDeleted: false,
        usageCount: locationData.collections.length,
        lastUsedAt: new Date(), // Will be updated from actual collection dates
      });

      const saved = await location.save();
      created++;

      // Link collections if requested
      if (linkCollections) {
        const result = await Project.updateMany(
          { _id: { $in: locationData.collections } },
          { locationId: saved._id }
        );
        linked += result.modifiedCount;
      }

      logger.info(`Created location: ${saved.locationName} (${locationData.collections.length} collections)`);
    } catch (error: any) {
      logger.error(`Failed to create location ${locationData.locationName}:`, error.message);
      skipped++;
    }
  }

  logger.info(`\nMigration Summary:`);
  logger.info(`  Created: ${created}`);
  logger.info(`  Skipped: ${skipped}`);
  if (linkCollections) {
    logger.info(`  Collections linked: ${linked}`);
  }
};

/**
 * Main migration function
 */
const migrate = async (): Promise<void> => {
  const linkCollections = process.argv.includes('--link-collections');

  try {
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.info('Connected to database');

    logger.info('Extracting unique locations from collections...');
    const uniqueLocations = await extractUniqueLocations();
    logger.info(`Found ${uniqueLocations.size} unique locations`);

    logger.info('Creating Location documents...');
    await createLocations(uniqueLocations, linkCollections);

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
};

// Run migration
migrate();

