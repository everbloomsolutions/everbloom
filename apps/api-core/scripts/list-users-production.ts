#!/usr/bin/env node

/**
 * List users from production MongoDB Atlas
 * 
 * Usage:
 *   # Using production environment variables
 *   NODE_ENV=production MONGODB_URI="mongodb+srv://..." tsx scripts/list-users-production.ts
 * 
 *   # Or set MONGODB_URI directly
 *   MONGODB_URI="mongodb+srv://..." tsx scripts/list-users-production.ts
 * 
 *   # Or load from .env.production
 *   dotenv -e .env.production -- tsx scripts/list-users-production.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';

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

interface UserInfo {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'agent';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string;
  company?: string;
}

/**
 * List all users from production database
 */
const listProductionUsers = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI is not set');
      console.error('\nPlease set MONGODB_URI environment variable:');
      console.error('  MONGODB_URI="mongodb+srv://..." tsx scripts/list-users-production.ts');
      console.error('\nOr use:');
      console.error('  dotenv -e .env.production -- tsx scripts/list-users-production.ts');
      process.exit(1);
    }

    // Validate it's not a localhost URI (safety check)
    if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      console.error('❌ Warning: MONGODB_URI appears to be local, not production!');
      console.error('   URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
      console.error('\nIf you want to list production users, use MongoDB Atlas URI.');
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('Continue anyway? (yes/no): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('Aborted.');
        process.exit(0);
      }
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all users
    const users = await User.find({ isDeleted: { $ne: true } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean<UserInfo[]>();

    if (users.length === 0) {
      console.log('📭 No users found in the database.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Display users in a formatted table
    console.log('📋 Users in Production Database:\n');
    console.log('═'.repeat(120));
    console.log(
      `${'Email'.padEnd(35)} ${'Name'.padEnd(25)} ${'Role'.padEnd(8)} ${'Status'.padEnd(10)} ${'Created'.padEnd(12)} ${'Phone'.padEnd(15)}`
    );
    console.log('═'.repeat(120));

    users.forEach((user) => {
      const email = (user.email || '').padEnd(35);
      const name = (user.name || 'N/A').padEnd(25);
      const role = (user.role || 'agent').padEnd(8);
      const status = (user.isActive ? '✅ Active' : '❌ Inactive').padEnd(10);
      const created = new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).padEnd(12);
      const phone = (user.phoneNumber || 'N/A').padEnd(15);
      
      console.log(`${email} ${name} ${role} ${status} ${created} ${phone}`);
    });

    console.log('═'.repeat(120));
    
    // Statistics
    console.log(`\n📊 Statistics:`);
    console.log(`   Total users: ${users.length}`);
    
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const agentCount = users.filter((u) => u.role === 'agent').length;
    const activeCount = users.filter((u) => u.isActive).length;
    const inactiveCount = users.length - activeCount;
    
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Agents: ${agentCount}`);
    console.log(`   - Active: ${activeCount}`);
    console.log(`   - Inactive: ${inactiveCount}`);

    // List admin users separately
    if (adminCount > 0) {
      console.log(`\n👑 Admin Users:`);
      users
        .filter((u) => u.role === 'admin')
        .forEach((admin, index) => {
          console.log(`   ${index + 1}. ${admin.email} (${admin.name || 'N/A'}) - ${admin.isActive ? 'Active' : 'Inactive'}`);
        });
    }

    // Show recent users
    const recentUsers = users.slice(0, 5);
    if (recentUsers.length > 0) {
      console.log(`\n🕒 Most Recent Users (last 5):`);
      recentUsers.forEach((user, index) => {
        const date = new Date(user.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        console.log(`   ${index + 1}. ${user.email} - Created: ${date}`);
      });
    }

    console.log('\n✅ Done!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error listing users:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run the script
listProductionUsers();

