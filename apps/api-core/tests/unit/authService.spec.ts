/**
 * AuthService Unit Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UserService } from '../../src/modules/user/user.service';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../setup';
import { UserModule } from '../../src/modules/user/user.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { DatabaseModule } from '../../src/infrastructure/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../src/common/common.module';
import { JwtService } from '../../src/common/services/jwt.service';
import { User } from '../../src/modules/user/schemas/user.schema';

describe('AuthService (NestJS)', () => {
  let module: TestingModule;
  let authService: AuthService;
  let userService: UserService;

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

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
  });

  beforeEach(async () => {
    await cleanupTestDB();
  });

  afterEach(async () => {
    await cleanupTestDB();
  });

  afterAll(async () => {
    await module.close();
    await closeTestDB();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      const result = await authService.registerUser(data);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(data.email.toLowerCase());
      expect(result.user.name).toBe(data.name);
      expect(result.user).not.toHaveProperty('password');

      // Verify token is valid
      const decoded = verifyToken(result.token);
      expect(decoded.userId).toBe(result.user._id.toString());
      expect(decoded.email).toBe(data.email.toLowerCase());
    });

    it('should throw error if email already exists', async () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await authService.registerUser(data);

      await expect(authService.registerUser(data)).rejects.toThrow();
    });

    it('should lowercase email before saving', async () => {
      const data = {
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
      };

      const result = await authService.registerUser(data);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should hash password before saving', async () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await authService.registerUser(data);
      const user = await User.findOne({ email: data.email });
      expect(user?.password).not.toBe(data.password);
      expect(user?.password).toBeDefined();
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      await authService.registerUser({
        email: 'login@example.com',
        password: 'Password123',
        name: 'Login User',
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.loginUser({
        email: 'login@example.com',
        password: 'Password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('login@example.com');
    });

    it('should throw error with invalid email', async () => {
      await expect(
        authService.loginUser({
          email: 'nonexistent@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow();
    });

    it('should throw error with invalid password', async () => {
      await expect(
        authService.loginUser({
          email: 'login@example.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow();
    });
  });
});
