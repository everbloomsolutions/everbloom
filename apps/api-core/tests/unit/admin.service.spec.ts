/**
 * AdminService Unit Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../../src/modules/admin/admin.service.nestjs';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AdminModule } from '../../src/modules/admin/admin.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UserModule } from '../../src/modules/user/user.module';
import { createNestTestingModule, cleanupNestUnitDB, closeNestUnitDB } from '../setup-nestjs-unit';
import { User } from '../../src/modules/user/user.model';

describe('AdminService (NestJS)', () => {
  let module: TestingModule;
  let adminService: AdminService;
  let authService: AuthService;

  beforeAll(async () => {
    module = await createNestTestingModule([
      UserModule,
      AuthModule,
      AdminModule,
    ]);

    adminService = module.get<AdminService>(AdminService);
    authService = module.get<AuthService>(AuthService);
  });

  beforeEach(async () => {
    await cleanupNestUnitDB();
  });

  afterEach(async () => {
    await cleanupNestUnitDB();
  });

  afterAll(async () => {
    await module.close();
    await closeNestUnitDB();
  });

  describe('getAdminStats', () => {
    it('should return admin statistics', async () => {
      // Create some test users
      await authService.registerUser({
        email: 'user1@example.com',
        password: 'Password123',
        name: 'User 1',
      });
      await authService.registerUser({
        email: 'user2@example.com',
        password: 'Password123',
        name: 'User 2',
      });

      const stats = await adminService.getAdminStats();

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats).toHaveProperty('totalContent');
      expect(stats).toHaveProperty('recentActivity');
      expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
      expect(stats.activeUsers).toBeGreaterThanOrEqual(2);
    });

    it('should count active users correctly', async () => {
      await authService.registerUser({
        email: 'active@example.com',
        password: 'Password123',
      });

      // Create inactive user
      const inactiveUser = await authService.registerUser({
        email: 'inactive@example.com',
        password: 'Password123',
      });
      const user = await User.findById(inactiveUser.user._id);
      if (user) {
        user.isActive = false;
        await user.save();
      }

      const stats = await adminService.getAdminStats();

      expect(stats.activeUsers).toBeGreaterThanOrEqual(1);
    });

    it('should return zero stats for empty database', async () => {
      const stats = await adminService.getAdminStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.activeUsers).toBe(0);
      expect(stats.totalContent).toBe(0);
      expect(stats.recentActivity).toBe(0);
    });
  });

  describe('getDashboard', () => {
    beforeEach(async () => {
      // Create multiple users
      await authService.registerUser({
        email: 'user1@example.com',
        password: 'Password123',
        name: 'User 1',
      });
      await authService.registerUser({
        email: 'user2@example.com',
        password: 'Password123',
        name: 'User 2',
      });

      // Create admin user
      const admin = await authService.registerUser({
        email: 'admin@example.com',
        password: 'Password123',
        name: 'Admin',
      });
      const adminUser = await User.findById(admin.user._id);
      if (adminUser) {
        adminUser.role = 'admin';
        await adminUser.save();
      }
    });

    it('should return dashboard data for admin', async () => {
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        throw new Error('Admin user not found');
      }

      const dashboard = await adminService.getDashboard(
        admin._id.toString(),
        true,
        'admin'
      );

      expect(dashboard).toHaveProperty('stats');
      expect(dashboard).toHaveProperty('recentUsers');
      expect(Array.isArray(dashboard.recentUsers)).toBe(true);
    });
  });
});
