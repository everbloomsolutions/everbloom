/**
 * User management script
 * Lists all users and allows creating admin users
 *
 * Usage:
 *   npm run manage-users                    # List all users
 *   npm run manage-users -- --add-admin     # Add admin user interactively
 *   npm run manage-users -- --add-admin --email=admin@example.com --password=admin123 --name="Admin User"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';
import { logger } from '../src/core/middleware/logger';
import { config } from '../src/core/config';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface _UserInfo {
  _id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  oauthProvider?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List all users in the database
 */
const listUsers = async (): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();

    if (users.length === 0) {
      console.log('\n📭 No users found in the database.\n');
      return;
    }

    console.log('\n📋 Users in database:\n');
    console.log('─'.repeat(100));
    console.log(
      `${'Email'.padEnd(30)} ${'Name'.padEnd(20)} ${'Role'.padEnd(8)} ${'Status'.padEnd(10)} ${'OAuth'.padEnd(12)} Created`
    );
    console.log('─'.repeat(100));

    users.forEach((user: any) => {
      const email = (user.email || '').padEnd(30);
      const name = (user.name || 'N/A').padEnd(20);
      const role = (user.role || 'user').padEnd(8);
      const status = (user.isActive ? 'Active' : 'Inactive').padEnd(10);
      const oauth = (user.oauthProvider || 'None').padEnd(12);
      const created = new Date(user.createdAt).toLocaleDateString();

      console.log(`${email} ${name} ${role} ${status} ${oauth} ${created}`);
    });

    console.log('─'.repeat(100));
    console.log(`\nTotal users: ${users.length}`);

    const adminCount = users.filter((u: any) => u.role === 'admin').length;
    const userCount = users.filter((u: any) => u.role === 'user').length;
    const activeCount = users.filter((u: any) => u.isActive).length;

    console.log(`  - Admins: ${adminCount}`);
    console.log(`  - Regular users: ${userCount}`);
    console.log(`  - Active: ${activeCount}`);
    console.log(`  - Inactive: ${users.length - activeCount}\n`);
  } catch (error) {
    logger.error('Error listing users:', error);
    throw error;
  }
};

/**
 * Create an admin user
 */
const createAdminUser = async (
  email?: string,
  password?: string,
  name?: string
): Promise<void> => {
  try {
    // Get user input if not provided
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(query, resolve);
      });
    };

    let adminEmail = email;
    let adminPassword = password;
    let adminName = name;

    if (!adminEmail) {
      adminEmail = await question('Enter admin email: ');
    }
    if (!adminEmail) {
      throw new Error('Email is required');
    }

    if (!adminPassword) {
      adminPassword = await question('Enter admin password (min 6 characters): ');
    }
    if (!adminPassword || adminPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    if (!adminName) {
      adminName = await question('Enter admin name (optional): ') || undefined;
    }

    rl.close();

    // Check if user already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`\n✅ User ${adminEmail} already exists and is an admin.\n`);
        return;
      }

      // Update existing user to admin
      existingUser.role = 'admin';
      if (adminPassword) {
        existingUser.password = adminPassword;
      }
      if (adminName) {
        existingUser.name = adminName;
      }
      await existingUser.save();
      console.log(`\n✅ Updated user ${adminEmail} to admin role.\n`);
      return;
    }

    // Create new admin user
    const adminUser = await User.create({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      name: adminName,
      role: 'admin',
      isActive: true,
    });

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name || 'N/A'}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser._id}\n`);
  } catch (error) {
    logger.error('Error creating admin user:', error);
    throw error;
  }
};

/**
 * Create a super admin user
 */
const createSuperAdminUser = async (
  email?: string,
  password?: string,
  name?: string
): Promise<void> => {
  try {
    // Get user input if not provided
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(query, resolve);
      });
    };

    let superAdminEmail = email;
    let superAdminPassword = password;
    let superAdminName = name;

    if (!superAdminEmail) {
      superAdminEmail = await question('Enter super admin email: ');
    }
    if (!superAdminEmail) {
      throw new Error('Email is required');
    }

    if (!superAdminPassword) {
      superAdminPassword = await question('Enter super admin password (min 8 characters): ');
    }
    if (!superAdminPassword || superAdminPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!superAdminName) {
      superAdminName = await question('Enter super admin name (optional): ') || undefined;
    }

    rl.close();

    // Check if user already exists
    const existingUser = await User.findOne({ email: superAdminEmail.toLowerCase() });
    if (existingUser) {
      if (existingUser.role === 'super_admin') {
        console.log(`\n✅ User ${superAdminEmail} already exists and is a super admin.\n`);
        return;
      }

      // Update existing user to super admin
      existingUser.role = 'super_admin';
      if (superAdminPassword) {
        existingUser.password = superAdminPassword;
      }
      if (superAdminName) {
        existingUser.name = superAdminName;
      }
      await existingUser.save();
      console.log(`\n✅ Updated user ${superAdminEmail} to super admin role.\n`);
      return;
    }

    // Create new super admin user
    const superAdminUser = await User.create({
      email: superAdminEmail.toLowerCase(),
      password: superAdminPassword,
      name: superAdminName,
      role: 'super_admin',
      isActive: true,
    });

    console.log(`\n✅ Super admin user created successfully!`);
    console.log(`   Email: ${superAdminUser.email}`);
    console.log(`   Name: ${superAdminUser.name || 'N/A'}`);
    console.log(`   Role: ${superAdminUser.role}`);
    console.log(`   ID: ${superAdminUser._id}\n`);
  } catch (error) {
    logger.error('Error creating super admin user:', error);
    throw error;
  }
};

/**
 * Main function
 */
const main = async (): Promise<void> => {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const addAdmin = args.includes('--add-admin');
    const addSuperAdmin = args.includes('--add-super-admin');

    // Parse email, password, name from args
    let email: string | undefined;
    let password: string | undefined;
    let name: string | undefined;

    args.forEach((arg) => {
      if (arg.startsWith('--email=')) {
        email = arg.split('=')[1];
      } else if (arg.startsWith('--password=')) {
        password = arg.split('=')[1];
      } else if (arg.startsWith('--name=')) {
        name = arg.split('=')[1];
      }
    });

    // Connect to database
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB');

    // List users
    await listUsers();

    // Add super admin if requested (takes precedence)
    if (addSuperAdmin) {
      await createSuperAdminUser(email, password, name);
      // List users again to show the new super admin
      await listUsers();
    } else if (addAdmin) {
      // Add admin if requested
      await createAdminUser(email, password, name);
      // List users again to show the new admin
      await listUsers();
    } else {
      console.log('💡 Tips:');
      console.log('   Use --add-admin to create an admin user');
      console.log('   Use --add-super-admin to create a super admin user');
      console.log('   Example: npm run manage-users -- --add-admin');
      console.log('   Example: npm run manage-users -- --add-super-admin --email=admin@example.com --password=Secure123!\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Script failed:', error);
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

main();
