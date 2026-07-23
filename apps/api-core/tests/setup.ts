import mongoose from 'mongoose';

// Test database connection
export const setupTestDB = async (): Promise<void> => {
  const testMongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/everbloom-test';

  if (!testMongoUri) {
    throw new Error('MongoDB URI not configured for tests');
  }

  await mongoose.connect(testMongoUri);
};

// Clean up database after tests
export const cleanupTestDB = async (): Promise<void> => {
  try {
    // Delete all documents from every collection across all open connections
    for (const conn of mongoose.connections) {
      if (conn.readyState === 1 && conn.db) {
        try {
          const collections = await conn.db.collections();
          for (const collection of collections) {
            try {
              // Skip system collections
              if (collection.collectionName.startsWith('system.')) {
                continue;
              }
              await collection.deleteMany({});
            } catch (error) {
              // Ignore individual collection errors
            }
          }
        } catch (error) {
          // Ignore connection-level errors
        }
      }
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
};

// Close database connection
export const closeTestDB = async (): Promise<void> => {
  for (const conn of mongoose.connections) {
    try {
      if (conn.readyState === 1) {
        await conn.dropDatabase();
      }
    } catch (error) {
      // Ignore drop errors
    }
  }
  for (const conn of mongoose.connections) {
    try {
      if (conn.readyState !== 0) {
        await conn.close();
      }
    } catch (error) {
      // Ignore close errors
    }
  }
};
