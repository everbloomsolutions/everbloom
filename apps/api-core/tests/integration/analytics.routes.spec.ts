/**
 * Analytics Routes Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { createTestUser } from '../utils/testHelpers';

describe('Analytics Routes (NestJS)', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();

    const user = await createTestUser({ email: 'user@example.com', name: 'Test User' });
    userToken = user.token;

    const admin = await createTestUser({ email: 'admin@example.com', name: 'Admin', role: 'admin' });
    adminToken = admin.token;
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  describe('POST /api/v1/analytics/events', () => {
    it('should create analytics event', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'page_view',
          properties: {
            page: '/home',
            referrer: 'https://example.com',
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('event');
      expect(response.body.data.event).toHaveProperty('eventType', 'page_view');
    });

    it('should return 400 for invalid event type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/analytics/events')
        .send({
          eventType: '',
          properties: {},
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/analytics/events (Admin)', () => {
    it('should get analytics events for admin', async () => {
      // First create an event
      await request(app.getHttpServer())
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'page_view',
          properties: { page: '/home' },
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('events');
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/events')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/analytics/stats/:eventType (Admin)', () => {
    it('should get analytics stats for admin', async () => {
      // First create some events
      await request(app.getHttpServer())
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'page_view',
          properties: { page: '/home' },
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/stats/page_view')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
    });
  });
});
