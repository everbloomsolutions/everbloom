/**
 * UserService Unit Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../../src/modules/user/user.service';
import { User, UserDocument } from '../../src/modules/user/schemas/user.schema';
import { AuthService } from '../../src/modules/auth/auth.service';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../setup';
import { UserModule } from '../../src/modules/user/user.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { DatabaseModule } from '../../src/infrastructure/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from '../../src/common/common.module';

describe('UserService (NestJS)', () => {
  let module: TestingModule;
  let userService: UserService;
  let authService: AuthService;
  let userId: string;

  beforeAll(async () => {
    await setupTestDB();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseModule,
        UserModule,
        AuthModule,
        CommonModule,
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    authService = module.get<AuthService>(AuthService);
  });

  beforeEach(async () => {
    await cleanupTestDB();

    // Create test user
    const result = await authService.registerUser({
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
    });
    userId = result.user._id.toString();
  });

  afterEach(async () => {
    await cleanupTestDB();
  });

  afterAll(async () => {
    await module.close();
    await closeTestDB();
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const result = await userService.updateProfile(userId, updateData);

      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('should update only name when provided', async () => {
      const updateData = {
        name: 'New Name',
      };

      const result = await userService.updateProfile(userId, updateData);

      expect(result.name).toBe('New Name');
      expect(result.email).toBe('test@example.com');
    });

    it('should update only email when provided', async () => {
      const updateData = {
        email: 'newemail@example.com',
      };

      const result = await userService.updateProfile(userId, updateData);

      expect(result.email).toBe('newemail@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should lowercase email before saving', async () => {
      const updateData = {
        email: 'UPPERCASE@EXAMPLE.COM',
      };

      const result = await userService.updateProfile(userId, updateData);

      expect(result.email).toBe('uppercase@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        name: 'Updated Name',
      };

      await expect(
        userService.updateProfile(fakeId, updateData)
      ).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException if email already exists', async () => {
      // Create another user
      await authService.registerUser({
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Existing User',
      });

      const updateData = {
        email: 'existing@example.com',
      };

      await expect(
        userService.updateProfile(userId, updateData)
      ).rejects.toThrow('Email is already in use');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordData = {
        currentPassword: 'Password123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      };

      await expect(
        userService.changePassword(userId, changePasswordData)
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const changePasswordData = {
        currentPassword: 'Password123',
        newPassword: 'NewPassword456',
        confirmPassword: 'DifferentPassword',
      };

      await expect(
        userService.changePassword(userId, changePasswordData)
      ).rejects.toThrow('Passwords do not match');
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const changePasswordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      };

      await expect(
        userService.changePassword(userId, changePasswordData)
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
