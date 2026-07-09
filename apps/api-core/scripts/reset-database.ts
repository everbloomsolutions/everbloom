#!/usr/bin/env node

/**
 * Reset Database Script
 * 
 * This script clears the entire database (users, locations, collections, receipts, etc.)
 * and creates a single super admin user.
 * 
 * Usage:
 *   npm run reset-db
 *   or
 *   RESET_CONFIRM=true npm run reset-db
 * 
 * Environment Variables:
 *   RESET_CONFIRM=true          - Skip confirmation prompt
 *   SUPER_ADMIN_EMAIL=email      - Super admin email (default: admin@everbloom.com)
 *   SUPER_ADMIN_PASSWORD=pass    - Super admin password (default: Admin@123)
 *   SUPER_ADMIN_NAME=name        - Super admin name (default: Super Admin)
 * 
 * WARNING: This will permanently delete ALL data from the database!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import { User } from '../src/modules/user/user.model';
import { Project } from '../src/modules/project/project.model';
import { Location } from '../src/modules/location/location.model';
import { Receipt } from '../src/modules/receipt/receipt.model';
import { Contact } from '../src/modules/content/contact.model';
import { AuditLog } from '../src/modules/audit/audit.model';
import { Notification } from '../src/modules/notification/notification.model';
import { AnalyticsEvent } from '../src/modules/analytics/analytics.model';
import { PasswordResetToken } from '../src/modules/auth/password-reset-token.model';
import { ReceiptSequence } from '../src/modules/receipt/receipt-sequence.model';
import { TokenBlacklist } from '../src/modules/auth/token-blacklist.model';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Default super admin credentials
const DEFAULT_SUPER_ADMIN_EMAIL = 'superadmin@everbloom.com';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'Admin@123';
const DEFAULT_SUPER_ADMIN_NAME = 'Super Admin';

/**
 * Prompt user for input
 */
const question = (rl: readline.Interface, query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

/**
 * Get super admin credentials from environment or prompt
 */
const getSuperAdminCredentials = async (): Promise<{
  email: string;
  password: string;
  name: string;
}> => {
  const email = process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || DEFAULT_SUPER_ADMIN_NAME;

  // If all credentials are provided via env, use them
  if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
    return { email, password, name };
  }

  // Otherwise, prompt for missing values
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let finalEmail = email;
  let finalPassword = password;
  let finalName = name;

  if (!process.env.SUPER_ADMIN_EMAIL) {
    finalEmail = await question(rl, `Enter super admin email [${DEFAULT_SUPER_ADMIN_EMAIL}]: `) || DEFAULT_SUPER_ADMIN_EMAIL;
  }

  if (!process.env.SUPER_ADMIN_PASSWORD) {
    finalPassword = await question(rl, `Enter super admin password [${DEFAULT_SUPER_ADMIN_PASSWORD}]: `) || DEFAULT_SUPER_ADMIN_PASSWORD;
    
    // Validate password
    if (finalPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      rl.close();
      process.exit(1);
    }
    
    // Check password requirements
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(finalPassword)) {
      console.error('❌ Password must contain at least one lowercase letter, one uppercase letter, and one number');
      rl.close();
      process.exit(1);
    }
  }

  if (!process.env.SUPER_ADMIN_NAME) {
    const nameInput = await question(rl, `Enter super admin name [${DEFAULT_SUPER_ADMIN_NAME}]: `);
    finalName = nameInput || DEFAULT_SUPER_ADMIN_NAME;
  }

  rl.close();
  return {
    email: finalEmail.toLowerCase().trim(),
    password: finalPassword,
    name: finalName.trim(),
  };
};

/**
 * Clear all collections from database
 */
const clearAllCollections = async (): Promise<void> => {
  console.log('\n🗑️  Clearing all collections...\n');

  const results: Record<string, number> = {};

  try {
    // Delete all users
    const usersResult = await User.deleteMany({});
    results.users = usersResult.deletedCount;
    console.log(`✅ Deleted ${results.users} user(s)`);

    // Delete all projects/collections
    const projectsResult = await Project.deleteMany({});
    results.projects = projectsResult.deletedCount;
    console.log(`✅ Deleted ${results.projects} collection(s)`);

    // Delete all locations
    const locationsResult = await Location.deleteMany({});
    results.locations = locationsResult.deletedCount;
    console.log(`✅ Deleted ${results.locations} location(s)`);

    // Delete all receipts
    const receiptsResult = await Receipt.deleteMany({});
    results.receipts = receiptsResult.deletedCount;
    console.log(`✅ Deleted ${results.receipts} receipt(s)`);

    // Delete all contacts
    const contactsResult = await Contact.deleteMany({});
    results.contacts = contactsResult.deletedCount;
    console.log(`✅ Deleted ${results.contacts} contact(s)`);

    // Delete all audit logs
    const auditLogsResult = await AuditLog.deleteMany({});
    results.auditLogs = auditLogsResult.deletedCount;
    console.log(`✅ Deleted ${results.auditLogs} audit log(s)`);

    // Delete all notifications
    const notificationsResult = await Notification.deleteMany({});
    results.notifications = notificationsResult.deletedCount;
    console.log(`✅ Deleted ${results.notifications} notification(s)`);

    // Delete all analytics events
    const analyticsResult = await AnalyticsEvent.deleteMany({});
    results.analytics = analyticsResult.deletedCount;
    console.log(`✅ Deleted ${results.analytics} analytics event(s)`);

    // Delete all password reset tokens
    const passwordResetTokensResult = await PasswordResetToken.deleteMany({});
    results.passwordResetTokens = passwordResetTokensResult.deletedCount;
    console.log(`✅ Deleted ${results.passwordResetTokens} password reset token(s)`);

    // Delete all receipt sequences
    const receiptSequencesResult = await ReceiptSequence.deleteMany({});
    results.receiptSequences = receiptSequencesResult.deletedCount;
    console.log(`✅ Deleted ${results.receiptSequences} receipt sequence(s)`);

    // Delete all token blacklist entries
    const tokenBlacklistResult = await TokenBlacklist.deleteMany({});
    results.tokenBlacklist = tokenBlacklistResult.deletedCount;
    console.log(`✅ Deleted ${results.tokenBlacklist} token blacklist entry/entries`);

    console.log('\n✨ All collections cleared successfully!');
    console.log('\nSummary:');
    Object.entries(results).forEach(([collection, count]) => {
      console.log(`   - ${collection}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error clearing collections:', error);
    throw error;
  }
};

/**
 * Create super admin user
 */
const createSuperAdmin = async (
  email: string,
  password: string,
  name: string
): Promise<void> => {
  try {
    console.log('\n👤 Creating super admin user...\n');

    const superAdmin = new User({
      email: email.toLowerCase().trim(),
      password: password,
      name: name.trim(),
      role: 'super_admin',
      isActive: true,
    });

    await superAdmin.save();

    console.log('✅ Super admin user created successfully!');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   ID: ${superAdmin._id}`);
    console.log(`   Active: ${superAdmin.isActive}`);

  } catch (error) {
    console.error('❌ Error creating super admin user:', error);
    throw error;
  }
};

/**
 * Main function
 */
const resetDatabase = async (): Promise<void> => {
  try {
    console.log('🔌 Connecting to database...');

    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to database');

    // Show warning and get confirmation
    console.log('\n⚠️  ════════════════════════════════════════════════════════════');
    console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
    console.log('⚠️  This includes:');
    console.log('⚠️    - All users');
    console.log('⚠️    - All locations');
    console.log('⚠️    - All collections/projects');
    console.log('⚠️    - All receipts');
    console.log('⚠️    - All contacts, audit logs, notifications, etc.');
    console.log('⚠️  ════════════════════════════════════════════════════════════\n');

    // Check for confirmation flag
    if (process.env.RESET_CONFIRM !== 'true') {
      console.log('⚠️  This action cannot be undone!');
      console.log('⚠️  To proceed, set RESET_CONFIRM=true environment variable');
      console.log('⚠️  Example: RESET_CONFIRM=true npm run reset-db\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('✅ Confirmation received. Proceeding with database reset...\n');

    // Clear all collections
    await clearAllCollections();

    // Get super admin credentials
    const credentials = await getSuperAdminCredentials();

    // Create super admin
    await createSuperAdmin(
      credentials.email,
      credentials.password,
      credentials.name
    );

    console.log('\n✨ Database reset completed successfully!');
    console.log('\n📋 Super Admin Credentials:');
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Password: ${credentials.password}`);
    console.log(`   Name: ${credentials.name}`);
    console.log('\n💡 You can now log in with these credentials.\n');

  } catch (error) {
    console.error('\n❌ Error resetting database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
};

// Run the script
resetDatabase();
