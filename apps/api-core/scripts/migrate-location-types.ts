/**
 * Migration script to update location type values
 *
 * Migrates from old values to new descriptive values:
 * - 'apartment' -> 'residential-apartment'
 * - 'society' -> 'residential-society'
 * - 'gated-community' -> 'residential-gated-community'
 *
 * Usage:
 *   pnpm tsx scripts/migrate-location-types.ts [--rollback]
 */

// mongoose not used directly; connection via connectDatabase
import _mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../src/core/db/database';
import { Project } from '../src/modules/project/project.model';
import { Receipt } from '../src/modules/receipt/receipt.model';
import { logger } from '../src/core/middleware/logger';

// Load environment variables
const cwd = process.cwd();
const rootDir = path.resolve(cwd, '..');
const rootEnvPath = path.resolve(rootDir, '.env');
const backendEnvPath = path.resolve(cwd, '.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath });

// Migration mapping
const LOCATION_TYPE_MIGRATION = {
  'apartment': 'residential-apartment',
  'society': 'residential-society',
  'gated-community': 'residential-gated-community',
} as const;

const REVERSE_MIGRATION = {
  'residential-apartment': 'apartment',
  'residential-society': 'society',
  'residential-gated-community': 'gated-community',
} as const;

/**
 * Run forward migration
 */
const migrateForward = async (): Promise<void> => {
  logger.info('Starting forward migration...');

  let projectCount = 0;
  let receiptCount = 0;

  // Migrate Projects
  for (const [oldValue, newValue] of Object.entries(LOCATION_TYPE_MIGRATION)) {
    const result = await Project.updateMany(
      { locationType: oldValue },
      { $set: { locationType: newValue } }
    );
    projectCount += result.modifiedCount;
    logger.info(`Migrated ${result.modifiedCount} projects: ${oldValue} -> ${newValue}`);
  }

  // Migrate Receipts
  for (const [oldValue, newValue] of Object.entries(LOCATION_TYPE_MIGRATION)) {
    const result = await Receipt.updateMany(
      { locationType: oldValue },
      { $set: { locationType: newValue } }
    );
    receiptCount += result.modifiedCount;
    logger.info(`Migrated ${result.modifiedCount} receipts: ${oldValue} -> ${newValue}`);
  }

  logger.info(`✅ Migration completed!`);
  logger.info(`   Projects migrated: ${projectCount}`);
  logger.info(`   Receipts migrated: ${receiptCount}`);
  logger.info(`   Total records migrated: ${projectCount + receiptCount}`);
};

/**
 * Run rollback migration
 */
const migrateRollback = async (): Promise<void> => {
  logger.info('Starting rollback migration...');

  let projectCount = 0;
  let receiptCount = 0;

  // Rollback Projects
  for (const [newValue, oldValue] of Object.entries(REVERSE_MIGRATION)) {
    const result = await Project.updateMany(
      { locationType: newValue },
      { $set: { locationType: oldValue } }
    );
    projectCount += result.modifiedCount;
    logger.info(`Rolled back ${result.modifiedCount} projects: ${newValue} -> ${oldValue}`);
  }

  // Rollback Receipts
  for (const [newValue, oldValue] of Object.entries(REVERSE_MIGRATION)) {
    const result = await Receipt.updateMany(
      { locationType: newValue },
      { $set: { locationType: oldValue } }
    );
    receiptCount += result.modifiedCount;
    logger.info(`Rolled back ${result.modifiedCount} receipts: ${newValue} -> ${oldValue}`);
  }

  logger.info(`✅ Rollback completed!`);
  logger.info(`   Projects rolled back: ${projectCount}`);
  logger.info(`   Receipts rolled back: ${receiptCount}`);
  logger.info(`   Total records rolled back: ${projectCount + receiptCount}`);
};

/**
 * Verify migration
 */
const verifyMigration = async (): Promise<void> => {
  logger.info('Verifying migration...');

  // Check for old values in Projects
  const oldProjectCount = await Project.countDocuments({
    locationType: { $in: Object.keys(LOCATION_TYPE_MIGRATION) },
  });

  // Check for new values in Projects
  const newProjectCount = await Project.countDocuments({
    locationType: { $in: Object.values(LOCATION_TYPE_MIGRATION) },
  });

  // Check for old values in Receipts
  const oldReceiptCount = await Receipt.countDocuments({
    locationType: { $in: Object.keys(LOCATION_TYPE_MIGRATION) },
  });

  // Check for new values in Receipts
  const newReceiptCount = await Receipt.countDocuments({
    locationType: { $in: Object.values(LOCATION_TYPE_MIGRATION) },
  });

  logger.info('Verification results:');
  logger.info(`  Projects with old values: ${oldProjectCount}`);
  logger.info(`  Projects with new values: ${newProjectCount}`);
  logger.info(`  Receipts with old values: ${oldReceiptCount}`);
  logger.info(`  Receipts with new values: ${newReceiptCount}`);

  if (oldProjectCount === 0 && oldReceiptCount === 0) {
    logger.info('✅ All records have been migrated successfully!');
  } else {
    logger.warn('⚠️  Some records still have old values. Migration may be incomplete.');
  }
};

/**
 * Main execution
 */
const main = async (): Promise<void> => {
  const isRollback = process.argv.includes('--rollback');
  const isVerify = process.argv.includes('--verify');

  try {
    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.info('✅ Connected to database');

    if (isVerify) {
      await verifyMigration();
    } else if (isRollback) {
      await migrateRollback();
    } else {
      await migrateForward();
      await verifyMigration();
    }

    logger.info('Migration script completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
};

// Run migration
main();

