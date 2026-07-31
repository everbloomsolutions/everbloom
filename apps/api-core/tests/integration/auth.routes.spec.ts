/**
 * Auth Routes Integration Tests (NestJS)
 * Example migration of Express tests to NestJS
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createNestApp, closeNestApp, cleanupNestDB } from '../setup-nestjs';
import { INestApplication } from '@nestjs/common';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

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
    it('should set httpOnly cookies and return user on login', async () => {
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
      expect(response.body.data).toHaveProperty('tokenExpiry');
      expect(response.body.data).not.toHaveProperty('token');
      expect(response.body.data).not.toHaveProperty('refreshToken');

      const rawCookies = response.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : (rawCookies ? [rawCookies] : []);
      expect(cookies.some(c => c.includes(`${ACCESS_TOKEN_COOKIE}=`))).toBe(true);
      expect(cookies.some(c => c.includes(`${REFRESH_TOKEN_COOKIE}=`))).toBe(true);
      expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some(c => c.includes('SameSite=Strict'))).toBe(true);
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

    it('should rate limit after 5 failed login attempts', async () => {
      for (let i = 0; i < 5; i += 1) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'rate-limit@example.com',
            password: 'WrongPassword',
          })
          .expect(401);
      }

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'rate-limit@example.com',
          password: 'WrongPassword',
        })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.status).toBe(429);
    });
  });
});
