/**
 * Notification Routes Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { createTestUser } from '../utils/testHelpers';

describe('Notification Routes (NestJS)', () => {
  let app: INestApplication;
  let userToken: string;
  let userId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();

    const user = await createTestUser({ email: 'user@example.com', name: 'Test User' });
    userToken = user.token;
    userId = user._id;

    const admin = await createTestUser({ email: 'admin@example.com', name: 'Admin', role: 'admin' });
    adminToken = admin.token;
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  describe('GET /api/v1/notifications', () => {
    it('should get user notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(Array.isArray(response.body.data.notifications)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should get unread notification count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
    });
  });

  describe('POST /api/v1/notifications (Admin)', () => {
    it('should create notification as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: userId,
          title: 'Test Notification',
          message: 'Test message',
          type: 'info',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', 'Test Notification');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: userId,
          title: 'Test Notification',
          message: 'Test message',
          type: 'info',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // First create a notification
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: userId,
          title: 'Test Notification',
          message: 'Test message',
          type: 'info',
        })
        .expect(201);

      const notificationId = createResponse.body.data._id;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
