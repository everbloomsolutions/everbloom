/**
 * List all admin and super_admin users in the database with usage summary.
 *
 * Usage:
 *   pnpm list-admin-users
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';

const rootEnvPath = path.resolve(__dirname, '../../.env.development');
const altRootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: altRootEnvPath });
dotenv.config({ path: backendEnvPath });

async function listAdminUsers(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/everbloom';
    if (!mongoUri || mongoUri.trim() === '') {
      throw new Error('MONGODB_URI is not set. Set it in .env or environment.');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const superAdmins = await User.find({ role: 'super_admin', isDeleted: { $ne: true } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const admins = await User.find({ role: 'admin', isDeleted: { $ne: true } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const width = 100;
    const row = (email: string, name: string, role: string, status: string, created: string, id: string) =>
      `${email.padEnd(32)} ${name.padEnd(22)} ${role.padEnd(12)} ${status.padEnd(10)} ${created.padEnd(12)} ${(id || '').slice(-12)}`;

    if (superAdmins.length > 0) {
      console.log('👑 Super Admin Users:\n');
      console.log('═'.repeat(width));
      console.log(row('Email', 'Name', 'Role', 'Status', 'Created', 'ID'));
      console.log('═'.repeat(width));
      (superAdmins as Array<Record<string, unknown>>).forEach((u) => {
        console.log(
          row(
            (u.email as string) || '',
            (u.name as string) || 'N/A',
            'super_admin',
            (u.isActive ? '✅ Active' : '❌ Inactive').padEnd(10),
            u.createdAt ? new Date(u.createdAt as string).toLocaleDateString() : 'N/A',
            (u._id as { toString(): string })?.toString() || '',
          ),
        );
      });
      console.log('═'.repeat(width));
      console.log(`   Total super_admin: ${superAdmins.length}\n`);
    }

    if (admins.length > 0) {
      console.log('👤 Admin Users:\n');
      console.log('═'.repeat(width));
      console.log(row('Email', 'Name', 'Role', 'Status', 'Created', 'ID'));
      console.log('═'.repeat(width));
      (admins as Array<Record<string, unknown>>).forEach((u) => {
        console.log(
          row(
            (u.email as string) || '',
            (u.name as string) || 'N/A',
            'admin',
            (u.isActive ? '✅ Active' : '❌ Inactive').padEnd(10),
            u.createdAt ? new Date(u.createdAt as string).toLocaleDateString() : 'N/A',
            (u._id as { toString(): string })?.toString() || '',
          ),
        );
      });
      console.log('═'.repeat(width));
      console.log(`   Total admin: ${admins.length}\n`);
    }

    if (superAdmins.length === 0 && admins.length === 0) {
      console.log('📭 No admin or super_admin users found.\n');
    }

    const roleCounts = await User.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    console.log('📊 Role usage (all users, non-deleted):');
    roleCounts.forEach((r) => {
      console.log(`   ${r._id}: ${r.count}`);
    });
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

listAdminUsers();
