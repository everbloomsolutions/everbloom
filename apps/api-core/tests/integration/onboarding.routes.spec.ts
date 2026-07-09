/**
 * Onboarding Routes Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { User } from '../../src/modules/user/user.model';

describe('Onboarding Routes (NestJS)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createNestApp();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();

    // Create a test user and get auth token for each test
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'Test1234',
        name: 'Test User',
      })
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.isNewUser).toBe(true);

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user._id;
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  describe('GET /api/v1/profile/onboarding/status', () => {
    it('should return onboarding status for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile/onboarding/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('onboardingCompleted');
      expect(response.body.data).toHaveProperty('profileComplete');
      expect(typeof response.body.data.onboardingCompleted).toBe('boolean');
      expect(typeof response.body.data.profileComplete).toBe('number');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile/onboarding/status')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/profile/onboarding/profile', () => {
    it('should update onboarding profile with valid data', async () => {
      const profileData = {
        name: 'Updated Name',
        phoneNumber: '+1234567890',
        company: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/profile/onboarding/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.phoneNumber).toBe('+1234567890');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/profile/onboarding/profile')
        .send({
          name: 'Updated Name',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/profile/onboarding/complete', () => {
    it('should complete onboarding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/profile/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user onboarding status
      const user = await User.findById(userId);
      expect(user?.onboardingCompleted).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/profile/onboarding/complete')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
