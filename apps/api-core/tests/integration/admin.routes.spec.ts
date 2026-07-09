/**
 * Admin Routes Integration Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';
import { createTestUser, createTestProject } from '../utils/testHelpers';
import mongoose from 'mongoose';
import { Project } from '../../src/modules/project/project.model';

describe('Admin Routes (NestJS)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

  beforeAll(async () => {
    app = await createNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();

    const admin = await createTestUser({ email: 'admin@test.com', role: 'admin' });
    adminToken = admin.token;
    adminId = admin._id;

    const user = await createTestUser({ email: 'user@test.com' });
    userToken = user.token;
    userId = user._id;
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return stats for admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('totalContent');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(typeof response.body.data.totalUsers).toBe('number');
      expect(typeof response.body.data.activeUsers).toBe('number');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return dashboard data for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('recentUsers');
      expect(Array.isArray(response.body.data.recentUsers)).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/collections', () => {
    beforeEach(async () => {
      await createTestProject(userId, { title: 'Project 1', serviceType: 'recycling' });
      await createTestProject(userId, { title: 'Project 2', serviceType: 'cctv' });
    });

    it('should get all projects for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
      expect(Array.isArray(response.body.data.projects)).toBe(true);
      expect(response.body.data.projects.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter projects by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/collections?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects.every((p: { status: string }) => p.status === 'pending')).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/collections')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/collections/:id/quote', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await createTestProject(userId, { status: 'pending' });
      projectId = project._id.toString();
    });

    it('should send quote for project', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/collections/${projectId}/quote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quoteAmount: 1000,
          quoteDetails: 'Test quote details',
          estimatedTimeline: '2 weeks',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('quoted');
      expect(response.body.data.quoteAmount).toBe(1000);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/collections/${projectId}/quote`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          quoteAmount: 1000,
          quoteDetails: 'Test quote',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
