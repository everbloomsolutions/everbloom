/**
 * Auth Flows with Onboarding Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { User } from '../../src/modules/user/user.model';

describe('Auth Flows with Onboarding (NestJS)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createNestApp();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  describe('Traditional Registration Flow', () => {
    it('should register new user and return isNewUser flag', async () => {
      const email = `newuser-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test1234',
          name: 'New User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isNewUser');
      expect(response.body.data.isNewUser).toBe(true);
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.token).toBeDefined();

      // Verify user was created with onboardingCompleted = false
      const user = await User.findOne({ email });
      expect(user).toBeDefined();
      expect(user?.onboardingCompleted).toBe(false);
    });

    it('should not return isNewUser for existing user login', async () => {
      // First register
      const email = `existing-${Date.now()}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test1234',
          name: 'Existing User',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.isNewUser).toBe(true);

      // Then login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'Test1234',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).not.toHaveProperty('isNewUser');
      expect(loginResponse.body.data.user.email).toBe(email);
    });

    it('should return 400 for duplicate email registration', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test1234',
          name: 'First User',
        })
        .expect(201);

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test1234',
          name: 'Second User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Onboarding Status', () => {
    it('should track onboarding completion status', async () => {
      const email = `onboarding-${Date.now()}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test1234',
          name: 'Onboarding User',
        })
        .expect(201);

      const token = registerResponse.body.data.token;

      // Check onboarding status
      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/profile/onboarding/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toHaveProperty('onboardingCompleted');
      expect(statusResponse.body.data.onboardingCompleted).toBe(false);
    });
  });
});
