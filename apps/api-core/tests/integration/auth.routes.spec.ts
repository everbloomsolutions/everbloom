/**
 * Auth Routes Integration Tests (NestJS)
 * Example migration of Express tests to NestJS
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';

describe('Auth Routes (NestJS)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createNestApp();
  });

  beforeEach(async () => {
    await cleanupNestDB();
  });

  afterEach(async () => {
    await cleanupNestDB();
  });

  afterAll(async () => {
    await closeNestApp();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.name).toBe('Test User');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Password123',
          name: 'Login User',
        })
        .expect(201);

      // Then login
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
