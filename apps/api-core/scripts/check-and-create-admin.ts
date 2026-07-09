#!/usr/bin/env node

/**
 * Check if admin@everbloom.com exists and create/update if needed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';
import bcrypt from 'bcryptjs';

// Load environment variables
const rootEnvPath = path.resolve(__dirname, '../../.env.development');
const altRootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: altRootEnvPath });
dotenv.config({ path: backendEnvPath });

const ADMIN_EMAIL = 'admin@everbloom.com';
const ADMIN_PASSWORD = 'Admin@123'; // Default password
const ADMIN_NAME = 'Admin User';

async function checkAndCreateAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/everbloom';
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check if user exists
    const existingUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    if (existingUser) {
      console.log(`✅ User found: ${ADMIN_EMAIL}`);
      console.log(`   ID: ${existingUser._id}`);
      console.log(`   Name: ${existingUser.name || 'N/A'}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.isActive}`);
      console.log(`   Has Password: ${!!existingUser.password}`);
      console.log(`   Onboarding Completed: ${existingUser.onboardingCompleted || false}`);

      // Test password
      if (existingUser.password) {
        const isMatch = await bcrypt.compare(ADMIN_PASSWORD, existingUser.password);
        console.log(`   Password Match (${ADMIN_PASSWORD}): ${isMatch ? '✅ YES' : '❌ NO'}`);

        if (!isMatch) {
          console.log('\n⚠️  Password does not match. Testing common passwords...');
          const commonPasswords = ['admin123', 'Admin123', 'password', 'Password123', 'admin', 'Admin@123'];
          for (const pwd of commonPasswords) {
            const match = await bcrypt.compare(pwd, existingUser.password);
            if (match) {
              console.log(`   ✅ Password found: "${pwd}"`);
              break;
            }
          }
        }
      } else {
        console.log('   ⚠️  No password set!');
      }

      // Check if needs to be updated
      let needsUpdate = false;
      if (existingUser.role !== 'admin') {
        console.log(`\n⚠️  User role is "${existingUser.role}", updating to "admin"...`);
        existingUser.role = 'admin';
        needsUpdate = true;
      }

      if (!existingUser.isActive) {
        console.log('⚠️  User is inactive, activating...');
        existingUser.isActive = true;
        needsUpdate = true;
      }

      if (!existingUser.password) {
        console.log('⚠️  Setting password...');
        existingUser.password = ADMIN_PASSWORD;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await existingUser.save();
        console.log('✅ User updated successfully');
      }

      console.log(`\n📋 Login Credentials:`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      if (existingUser.password) {
        const isMatch = await bcrypt.compare(ADMIN_PASSWORD, existingUser.password);
        if (isMatch) {
          console.log(`   Password: ${ADMIN_PASSWORD}`);
        } else {
          console.log(`   Password: [HASHED - Use reset or check above for correct password]`);
        }
      } else {
        console.log(`   Password: ${ADMIN_PASSWORD} (just set)`);
      }

    } else {
      console.log(`❌ User not found: ${ADMIN_EMAIL}`);
      console.log('\n📝 Creating admin user...');

      const adminUser = new User({
        email: ADMIN_EMAIL.toLowerCase(),
        password: ADMIN_PASSWORD,
        name: ADMIN_NAME,
        role: 'admin',
        isActive: true,
        onboardingCompleted: true, // Skip onboarding for admin
      });

      await adminUser.save();

      console.log('✅ Admin user created successfully!');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log(`   Role: admin`);
      console.log(`   ID: ${adminUser._id}`);
    }

    // List all admin users
    console.log('\n📋 All Admin Users in Database:');
    const allAdmins = await User.find({ role: 'admin' }).select('email name role isActive');
    if (allAdmins.length === 0) {
      console.log('   No admin users found');
    } else {
      allAdmins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.email} (${admin.name || 'N/A'}) - Active: ${admin.isActive}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
checkAndCreateAdmin();

