#!/usr/bin/env node

/**
 * Check database schema and collections in production MongoDB Atlas
 *
 * Usage:
 *   pnpm run check-db-schema:prod
 *   MONGODB_URI="mongodb+srv://..." pnpm run check-db-schema:prod
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User as _User } from '../src/modules/user/user.model';

// Load environment variables (production priority)
const rootDir = path.resolve(__dirname, '../..');
const prodEnvPath = path.resolve(rootDir, '.env.production');
const prodShortPath = path.resolve(rootDir, '.env.prod');
const rootEnvPath = path.resolve(rootDir, '.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

// Load in priority order
dotenv.config({ path: prodShortPath });
dotenv.config({ path: prodEnvPath });
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath });

/**
 * Check database schema, collections, and indexes
 */
const checkDatabaseSchema = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI is not set');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const dbName = db.databaseName;
    console.log(`📊 Database: ${dbName}\n`);

    // List all collections
    console.log('📁 Collections in database:');
    console.log('─'.repeat(60));
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('   ⚠️  No collections found in database');
      console.log('   This might be a new database or the schema hasn\'t been initialized.\n');
    } else {
      for (const collection of collections) {
        const collectionName = collection.name;
        const stats = await db.collection(collectionName).stats();
        const count = await db.collection(collectionName).countDocuments();

        console.log(`   📄 ${collectionName}`);
        console.log(`      Documents: ${count}`);
        console.log(`      Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`      Storage: ${(stats.storageSize / 1024).toFixed(2)} KB`);
        console.log('');
      }
    }

    // Check User collection specifically
    console.log('👤 User Collection Details:');
    console.log('─'.repeat(60));

    const userCollection = db.collection('users');
    const userExists = collections.some(c => c.name === 'users');

    if (!userExists) {
      console.log('   ❌ Users collection does not exist');
      console.log('   💡 The collection will be created automatically when the first user is saved.\n');
    } else {
      const userCount = await userCollection.countDocuments();
      const userCountActive = await userCollection.countDocuments({ isActive: true });
      const userCountDeleted = await userCollection.countDocuments({ isDeleted: true });
      const adminCount = await userCollection.countDocuments({ role: 'admin' });
      const agentCount = await userCollection.countDocuments({ role: 'agent' });

      console.log(`   ✅ Users collection exists`);
      console.log(`   Total users: ${userCount}`);
      console.log(`   Active users: ${userCountActive}`);
      console.log(`   Deleted users: ${userCountDeleted}`);
      console.log(`   Admins: ${adminCount}`);
      console.log(`   Agents: ${agentCount}\n`);

      // Check indexes
      console.log('🔍 Indexes on Users collection:');
      console.log('─'.repeat(60));
      const indexes = await userCollection.indexes();

      if (indexes.length === 0) {
        console.log('   ⚠️  No indexes found');
        console.log('   💡 Indexes will be created automatically when the model is used.\n');
      } else {
        indexes.forEach((index, idx) => {
          const indexName = index.name;
          const indexKeys = Object.keys(index.key).map(key => `${key}:${index.key[key]}`).join(', ');
          const isUnique = index.unique ? ' (unique)' : '';
          const isSparse = index.sparse ? ' (sparse)' : '';

          console.log(`   ${idx + 1}. ${indexName}`);
          console.log(`      Keys: {${indexKeys}}${isUnique}${isSparse}`);
        });
        console.log('');
      }

      // Sample users (if any)
      if (userCount > 0) {
        console.log('📋 Sample Users (first 5):');
        console.log('─'.repeat(60));
        const sampleUsers = await userCollection
          .find({}, { projection: { email: 1, name: 1, role: 1, isActive: 1, createdAt: 1, _id: 0 } })
          .limit(5)
          .toArray();

        sampleUsers.forEach((user, idx) => {
          console.log(`   ${idx + 1}. ${user.email}`);
          console.log(`      Name: ${user.name || 'N/A'}`);
          console.log(`      Role: ${user.role || 'N/A'}`);
          console.log(`      Active: ${user.isActive ? 'Yes' : 'No'}`);
          console.log(`      Created: ${new Date(user.createdAt).toLocaleString()}`);
          console.log('');
        });
      }
    }

    // Check if User model is properly registered
    console.log('🔧 Mongoose Model Registration:');
    console.log('─'.repeat(60));
    const modelNames = mongoose.modelNames();
    console.log(`   Registered models: ${modelNames.length}`);
    modelNames.forEach((name, idx) => {
      console.log(`   ${idx + 1}. ${name}`);
    });

    if (modelNames.includes('User')) {
      console.log('\n   ✅ User model is registered');
    } else {
      console.log('\n   ⚠️  User model is not registered');
      console.log('   💡 This is normal if the model hasn\'t been imported yet.');
    }

    // Test creating a model instance (to trigger schema registration)
    console.log('\n🧪 Testing Schema Registration:');
    console.log('─'.repeat(60));
    try {
      // This will ensure the schema is registered
      const UserModel = mongoose.model('User');
      const schema = UserModel.schema;
      const paths = Object.keys(schema.paths);

      console.log(`   ✅ User schema is registered`);
      console.log(`   Schema paths: ${paths.length}`);
      console.log(`   Fields: ${paths.slice(0, 10).join(', ')}${paths.length > 10 ? '...' : ''}`);

      // Check required fields
      const requiredFields: string[] = [];
      schema.eachPath((pathName, pathType) => {
        if (pathType.isRequired) {
          requiredFields.push(pathName);
        }
      });

      if (requiredFields.length > 0) {
        console.log(`   Required fields: ${requiredFields.join(', ')}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error accessing User model: ${error instanceof Error ? error.message : error}`);
    }

    // Database stats
    console.log('\n📈 Database Statistics:');
    console.log('─'.repeat(60));
    const dbStats = await db.stats();
    console.log(`   Collections: ${dbStats.collections}`);
    console.log(`   Data size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Index size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Indexes: ${dbStats.indexes}`);

    // Connection info
    console.log('\n🔗 Connection Information:');
    console.log('─'.repeat(60));
    const conn = mongoose.connection;
    console.log(`   Ready state: ${['disconnected', 'connected', 'connecting', 'disconnecting'][conn.readyState]}`);
    console.log(`   Host: ${conn.host || 'N/A'}`);
    console.log(`   Port: ${conn.port || 'N/A'}`);
    console.log(`   Name: ${conn.name || 'N/A'}`);

    console.log('\n✅ Database schema check completed!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error checking database schema:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run the script
checkDatabaseSchema();

