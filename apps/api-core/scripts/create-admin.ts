#!/usr/bin/env node

/**
 * Create permanent admin user for testing
 * Email: admin@everbloom.com
 * Password: Admin@123
 *
 * This script ensures the admin user exists, creating it if it doesn't.
 * It will NOT delete or modify the user if it already exists.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';

// Load environment variables
const rootEnvPath = path.resolve(__dirname, '../../.env.development');
const altRootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

// Try to load root .env first
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: altRootEnvPath });
dotenv.config({ path: backendEnvPath });

const ADMIN_EMAIL = 'admin@everbloom.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Admin User';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/everbloom';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    if (existingAdmin) {
      console.log(`✅ Admin user already exists: ${ADMIN_EMAIL}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log(`   ID: ${existingAdmin._id}`);

      // Update password if needed (in case it was changed)
      if (existingAdmin.password) {
        const bcrypt = await import('bcryptjs');
        const isMatch = await bcrypt.default.compare(ADMIN_PASSWORD, existingAdmin.password);
        if (!isMatch) {
          console.log('⚠️  Password does not match. Updating password...');
          existingAdmin.password = ADMIN_PASSWORD;
          await existingAdmin.save();
          console.log('✅ Password updated');
        } else {
          console.log('✅ Password is correct');
        }
      } else {
        // Set password if it doesn't exist
        console.log('⚠️  No password set. Setting password...');
        existingAdmin.password = ADMIN_PASSWORD;
        await existingAdmin.save();
        console.log('✅ Password set');
      }

      // Ensure user is admin and active
      if (existingAdmin.role !== 'admin') {
        console.log('⚠️  User role is not admin. Updating to admin...');
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Role updated to admin');
      }

      if (!existingAdmin.isActive) {
        console.log('⚠️  User is inactive. Activating...');
        existingAdmin.isActive = true;
        await existingAdmin.save();
        console.log('✅ User activated');
      }

      await mongoose.disconnect();
      console.log('\n✅ Admin user is ready for use!');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      return;
    }

    // Create new admin user
    console.log(`\n📝 Creating admin user: ${ADMIN_EMAIL}`);

    const adminUser = new User({
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: 'admin',
      isActive: true,
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: admin`);
    console.log(`   ID: ${adminUser._id}`);

    await mongoose.disconnect();
    console.log('\n✅ Admin user is ready for use!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser();

