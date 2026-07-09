/**
 * AnalyticsService Unit Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AnalyticsModule } from '../../src/modules/analytics/analytics.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UserModule } from '../../src/modules/user/user.module';
import { createNestTestingModule, cleanupNestUnitDB, closeNestUnitDB } from '../setup-nestjs-unit';

describe('AnalyticsService (NestJS)', () => {
  let module: TestingModule;
  let analyticsService: AnalyticsService;
  let authService: AuthService;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    module = await createNestTestingModule([
      UserModule,
      AuthModule,
      AnalyticsModule,
    ]);

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    authService = module.get<AuthService>(AuthService);
  });

  beforeEach(async () => {
    await cleanupNestUnitDB();

    const user1 = await authService.registerUser({
      email: 'user1@example.com',
      password: 'Password123',
    });
    userId = user1.user._id.toString();

    const user2 = await authService.registerUser({
      email: 'user2@example.com',
      password: 'Password123',
    });
    otherUserId = user2.user._id.toString();
  });

  afterEach(async () => {
    await cleanupNestUnitDB();
  });

  afterAll(async () => {
    await module.close();
    await closeNestUnitDB();
  });

  describe('createAnalyticsEvent', () => {
    it('should create analytics event successfully', async () => {
      const data = {
        eventType: 'page_view',
        sessionId: 'session123',
        properties: { page: '/home' },
      };

      const event = await analyticsService.createAnalyticsEvent(
        data,
        userId,
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(event).toHaveProperty('_id');
      expect(event.eventType).toBe('page_view');
      expect(event.userId?.toString()).toBe(userId);
      expect(event.sessionId).toBe('session123');
      expect(event.properties).toEqual({ page: '/home' });
      expect(event.ipAddress).toBe('127.0.0.1');
      expect(event.userAgent).toBe('Mozilla/5.0');
    });

    it('should create event without user', async () => {
      const data = {
        eventType: 'page_view',
        sessionId: 'session123',
      };

      const event = await analyticsService.createAnalyticsEvent(data);

      expect(event.eventType).toBe('page_view');
      expect(event.userId).toBeUndefined();
    });

    it('should create event with default empty properties', async () => {
      const data = {
        eventType: 'click',
      };

      const event = await analyticsService.createAnalyticsEvent(data);

      expect(event.properties).toEqual({});
    });
  });

  describe('getAnalyticsEvents', () => {
    beforeEach(async () => {
      // Create multiple events
      await analyticsService.createAnalyticsEvent({
        eventType: 'page_view',
        sessionId: 'session1',
        properties: { page: '/home' },
      }, userId);
      await analyticsService.createAnalyticsEvent({
        eventType: 'page_view',
        sessionId: 'session1',
        properties: { page: '/about' },
      }, userId);
      await analyticsService.createAnalyticsEvent({
        eventType: 'click',
        sessionId: 'session1',
        properties: { button: 'submit' },
      }, userId);
    });

    it('should get analytics events', async () => {
      const result = await analyticsService.getAnalyticsEvents({
        page: 1,
        limit: 10,
      });

      expect(result.events.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter events by event type', async () => {
      const result = await analyticsService.getAnalyticsEvents({
        page: 1,
        limit: 10,
        eventType: 'page_view',
      });

      expect(result.events.every((e) => e.eventType === 'page_view')).toBe(true);
    });

    it('should filter events by user', async () => {
      const result = await analyticsService.getAnalyticsEvents({
        page: 1,
        limit: 10,
        userId,
      });

      expect(result.events.every((e) => e.userId?.toString() === userId)).toBe(true);
    });
  });

  describe('getAnalyticsStats', () => {
    beforeEach(async () => {
      // Create events for stats
      await analyticsService.createAnalyticsEvent({
        eventType: 'page_view',
        sessionId: 'session1',
      }, userId);
      await analyticsService.createAnalyticsEvent({
        eventType: 'page_view',
        sessionId: 'session2',
      }, userId);
      await analyticsService.createAnalyticsEvent({
        eventType: 'click',
        sessionId: 'session1',
      }, userId);
    });

    it('should get analytics stats', async () => {
      const stats = await analyticsService.getAnalyticsStats('page_view');

      expect(stats).toHaveProperty('total');
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });
  });
});
