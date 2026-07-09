/**
 * Auth Guard Unit Tests (NestJS)
 * Tests NestJS AuthGuard for request authentication
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../../src/common/guards/auth.guard';
import { AuthService } from '../../src/modules/auth/auth.service';
import { TokenBlacklistService } from '../../src/common/services/token-blacklist.service';
import { JwtService } from '../../src/common/services/jwt.service';
import { ConfigModule } from '@nestjs/config';
import { createNestTestingModule, cleanupNestUnitDB, closeNestUnitDB } from '../setup-nestjs-unit';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UserModule } from '../../src/modules/user/user.module';
import { CommonModule } from '../../src/common/common.module';

describe('AuthGuard (NestJS)', () => {
  let module: TestingModule;
  let authGuard: AuthGuard;
  let authService: AuthService;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    module = await createNestTestingModule([
      UserModule,
      AuthModule,
      CommonModule,
    ]);

    authGuard = module.get<AuthGuard>(AuthGuard);
    authService = module.get<AuthService>(AuthService);
  });

  beforeEach(async () => {
    await cleanupNestUnitDB();

    // Create test user and get token
    const result = await authService.registerUser({
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
    });
    userId = result.user._id.toString();
    token = result.token;
  });

  afterEach(async () => {
    await cleanupNestUnitDB();
  });

  afterAll(async () => {
    await module.close();
    await closeNestUnitDB();
  });

  describe('canActivate', () => {
    it('should allow request with valid token', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: `Bearer ${token}`,
            },
          }),
        }),
      } as ExecutionContext;

      const result = await authGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should reject request without token', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      } as ExecutionContext;

      await expect(authGuard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with invalid token', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: 'Bearer invalid-token',
            },
          }),
        }),
      } as ExecutionContext;

      await expect(authGuard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with blacklisted token', async () => {
      const tokenBlacklistService = module.get<TokenBlacklistService>(TokenBlacklistService);
      
      // Blacklist the token
      await tokenBlacklistService.addToBlacklist(token, userId);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: `Bearer ${token}`,
            },
          }),
        }),
      } as ExecutionContext;

      await expect(authGuard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });
});
