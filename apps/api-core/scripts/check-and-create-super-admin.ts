#!/usr/bin/env node

/**
 * Check if super_admin exists (default: superadmin@everbloom.com), create/update if needed,
 * then list all super_admin users and usage summary.
 *
 * Usage:
 *   pnpm check-and-create-super-admin
 *   SUPER_ADMIN_EMAIL=x SUPER_ADMIN_PASSWORD=y pnpm check-and-create-super-admin
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';
import bcrypt from 'bcryptjs';

const rootEnvPath = path.resolve(__dirname, '../../.env.development');
const altRootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: altRootEnvPath });
dotenv.config({ path: backendEnvPath });

const DEFAULT_SUPER_ADMIN_EMAIL = 'superadmin@everbloom.com';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'Admin@123';
const DEFAULT_SUPER_ADMIN_NAME = 'Super Admin';

async function checkAndCreateSuperAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/everbloom';
    const email = process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME || DEFAULT_SUPER_ADMIN_NAME;

    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      console.log(`✅ Super admin user found: ${email}`);
      console.log(`   ID: ${existingUser._id}`);
      console.log(`   Name: ${existingUser.name || 'N/A'}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.isActive}`);

      if (existingUser.password) {
        const isMatch = await bcrypt.compare(password, existingUser.password);
        console.log(`   Password Match (default): ${isMatch ? '✅ YES' : '❌ NO'}`);
      } else {
        console.log('   ⚠️  No password set');
      }

      let needsUpdate = false;
      if (existingUser.role !== 'super_admin') {
        console.log(`\n⚠️  User role is "${existingUser.role}", updating to "super_admin"...`);
        existingUser.role = 'super_admin';
        needsUpdate = true;
      }
      if (!existingUser.isActive) {
        console.log('⚠️  User is inactive, activating...');
        existingUser.isActive = true;
        needsUpdate = true;
      }
      if (!existingUser.password) {
        existingUser.password = password;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await existingUser.save();
        console.log('✅ User updated successfully');
      }

      console.log(`\n📋 Login (super_admin):`);
      console.log(`   Email: ${email}`);
      if (existingUser.password && (await bcrypt.compare(password, existingUser.password))) {
        console.log(`   Password: ${password}`);
      } else {
        console.log(`   Password: [HASHED - use env SUPER_ADMIN_PASSWORD or reset]`);
      }
    } else {
      console.log(`❌ Super admin not found: ${email}`);
      console.log('\n📝 Creating super_admin user...');

      const superAdmin = new User({
        email: email.toLowerCase(),
        password,
        name,
        role: 'super_admin',
        isActive: true,
      });
      await superAdmin.save();

      console.log('✅ Super admin created successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: super_admin`);
      console.log(`   ID: ${superAdmin._id}`);
    }

    // List all super_admin users and usage
    console.log('\n📋 Super Admin Users:');
    const superAdmins = await User.find({ role: 'super_admin' })
      .select('email name isActive createdAt')
      .sort({ createdAt: 1 })
      .lean();

    if (superAdmins.length === 0) {
      console.log('   None found.');
    } else {
      console.log('   ' + '─'.repeat(80));
      superAdmins.forEach((u, i) => {
        const created = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : 'N/A';
        console.log(`   ${i + 1}. ${u.email} | ${(u.name || 'N/A').padEnd(20)} | ${u.isActive ? 'Active' : 'Inactive'} | ${created}`);
      });
      console.log('   ' + '─'.repeat(80));
      console.log(`   Total super_admin: ${superAdmins.length}`);
    }

    // Role usage summary
    const roleCounts = await User.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    console.log('\n📊 Role usage (all users, non-deleted):');
    roleCounts.forEach((r) => {
      console.log(`   ${r._id}: ${r.count}`);
    });

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

checkAndCreateSuperAdmin();
