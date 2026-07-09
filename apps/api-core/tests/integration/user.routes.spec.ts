/**
 * User Routes Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { createTestUser } from '../utils/testHelpers';

describe('User Routes (NestJS)', () => {
  let app: INestApplication;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();

    const user = await createTestUser({ email: 'user@example.com', name: 'Test User' });
    userToken = user.token;
    userId = user._id;
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  describe('PUT /api/v1/profile/update', () => {
    it('should update user profile', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          email: 'updated@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.email).toBe('updated@example.com');
    });

    it('should update only name', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'New Name Only',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name Only');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile/update')
        .send({
          name: 'Should Fail',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/profile/change-password', () => {
    it('should change password successfully', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 if passwords do not match', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword123',
          confirmPassword: 'DifferentPassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for incorrect current password', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
