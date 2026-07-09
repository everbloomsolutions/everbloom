/**
 * NotificationService Unit Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../src/modules/notification/notification.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { NotificationModule } from '../../src/modules/notification/notification.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UserModule } from '../../src/modules/user/user.module';
import { createNestTestingModule, cleanupNestUnitDB, closeNestUnitDB } from '../setup-nestjs-unit';

describe('NotificationService (NestJS)', () => {
  let module: TestingModule;
  let notificationService: NotificationService;
  let authService: AuthService;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    module = await createNestTestingModule([
      UserModule,
      AuthModule,
      NotificationModule,
    ]);

    notificationService = module.get<NotificationService>(NotificationService);
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

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const data = {
        userId,
        title: 'Test Notification',
        message: 'Test message',
        type: 'info' as const,
      };

      const notification = await notificationService.createNotification(data);

      expect(notification).toHaveProperty('_id');
      expect(notification.title).toBe('Test Notification');
      expect(notification.message).toBe('Test message');
      expect(notification.type).toBe('info');
      expect(notification.isRead).toBe(false);
      expect(notification.user.toString()).toBe(userId);
    });

    it('should create notification with default type', async () => {
      const data = {
        userId,
        title: 'Test Notification',
        message: 'Test message',
      };

      const notification = await notificationService.createNotification(data);

      expect(notification.type).toBe('info');
    });

    it('should create notification with link and metadata', async () => {
      const data = {
        userId,
        title: 'Test Notification',
        message: 'Test message',
        link: '/projects/123',
        metadata: { projectId: '123' },
      };

      const notification = await notificationService.createNotification(data);

      expect(notification.link).toBe('/projects/123');
      expect(notification.metadata).toEqual({ projectId: '123' });
    });
  });

  describe('getNotifications', () => {
    beforeEach(async () => {
      // Create multiple notifications
      await notificationService.createNotification({
        userId,
        title: 'Notification 1',
        message: 'Message 1',
      });
      await notificationService.createNotification({
        userId,
        title: 'Notification 2',
        message: 'Message 2',
      });
      await notificationService.createNotification({
        userId,
        title: 'Notification 3',
        message: 'Message 3',
        type: 'success',
      });
    });

    it('should get user notifications', async () => {
      const result = await notificationService.getNotifications(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.notifications.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter notifications by type', async () => {
      const result = await notificationService.getNotifications(userId, {
        page: 1,
        limit: 10,
        type: 'success',
      });

      expect(result.notifications.every((n) => n.type === 'success')).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await notificationService.createNotification({
        userId,
        title: 'Test Notification',
        message: 'Test message',
      });

      await notificationService.markAsRead(notification._id.toString(), userId);

      const updated = await notificationService.getNotifications(userId, {
        page: 1,
        limit: 10,
      });

      const found = updated.notifications.find(
        (n) => n._id.toString() === notification._id.toString()
      );
      expect(found?.isRead).toBe(true);
    });
  });
});
