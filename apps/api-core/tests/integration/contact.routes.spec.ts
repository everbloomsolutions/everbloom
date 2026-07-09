/**
 * Contact Routes Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { createTestUser } from '../utils/testHelpers';

describe('Contact Routes (NestJS)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();

    const admin = await createTestUser({ email: 'admin@example.com', name: 'Admin', role: 'admin' });
    adminToken = admin.token;
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  describe('POST /api/v1/contact', () => {
    it('should submit contact form', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contact')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Test Subject',
          message: 'Test message content',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'John Doe');
      expect(response.body.data).toHaveProperty('email', 'john@example.com');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contact')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          subject: 'Test Subject',
          message: 'Test message',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contact')
        .send({
          name: 'John Doe',
          // Missing email, subject, message
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/contact (Admin)', () => {
    it('should get all contacts for admin', async () => {
      // First create a contact
      await request(app.getHttpServer())
        .post('/api/v1/contact')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Test Subject',
          message: 'Test message',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/contact')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('contacts');
      expect(Array.isArray(response.body.data.contacts)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contact')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
