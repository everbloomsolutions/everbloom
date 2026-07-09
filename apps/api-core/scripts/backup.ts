import mongoose from 'mongoose';
import { config } from '../src/core/config';
import { logger } from '../src/core/middleware/logger';
import fs from 'fs';
import path from 'path';

/**
 * Database backup script
 * Usage: npm run backup
 */
const backupDatabase = async (): Promise<void> => {
  try {
    logger.info('Starting database backup...');

    // Connect to database
    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    logger.info(`Found ${collections.length} collections`);

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    const backup: Record<string, unknown[]> = {};

    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      logger.info(`Backing up collection: ${collectionName}`);

      const data = await mongoose.connection.db
        .collection(collectionName)
        .find({})
        .toArray();

      backup[collectionName] = data;
      logger.info(`Exported ${data.length} documents from ${collectionName}`);
    }

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    logger.info(`Backup saved to: ${backupFile}`);

    // Clean up old backups (keep last 7 days)
    const files = fs.readdirSync(backupDir);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < sevenDaysAgo) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted old backup: ${file}`);
      }
    }

    await mongoose.connection.close();
    logger.info('Database backup completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Backup failed:', error);
    process.exit(1);
  }
};

backupDatabase();

