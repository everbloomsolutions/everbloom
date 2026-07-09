/**
 * Project Routes Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { createTestUser, createTestProject } from '../utils/testHelpers';

describe('Project Routes (NestJS)', () => {
  let app: INestApplication;
  let userToken: string;
  let userId: string;
  let adminToken: string;
  let adminId: string;

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
    adminId = admin._id;
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceType: 'recycling',
          title: 'Test Project',
          description: 'Test Description',
          location: {
            address: '123 Test St',
            city: 'Test City',
          },
          priority: 'high',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.serviceType).toBe('recycling');
      expect(response.body.data.title).toBe('Test Project');
      expect(response.body.data.status).toBe('pending');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .send({
          serviceType: 'recycling',
          title: 'Test Project',
          description: 'Test Description',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Missing required fields
          title: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should get user projects', async () => {
      // Create a project for the user
      await createTestProject(userId, {
        title: 'User Project',
        serviceType: 'recycling',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
      expect(Array.isArray(response.body.data.projects)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get project by id', async () => {
      const project = await createTestProject(userId, {
        title: 'Test Project',
        serviceType: 'recycling',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', project._id.toString());
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/projects/:id/accept-quote', () => {
    it('should accept quote for project', async () => {
      const project = await createTestProject(userId, {
        title: 'Test Project',
        serviceType: 'recycling',
        status: 'quoted',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project._id}/accept-quote`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          notes: 'Accepting the quote',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 if project is not quoted', async () => {
      const project = await createTestProject(userId, {
        title: 'Test Project',
        serviceType: 'recycling',
        status: 'pending',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project._id}/accept-quote`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          notes: 'Accepting the quote',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/projects/:id/reject-quote', () => {
    it('should reject quote for project', async () => {
      const project = await createTestProject(userId, {
        title: 'Test Project',
        serviceType: 'recycling',
        status: 'quoted',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project._id}/reject-quote`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
