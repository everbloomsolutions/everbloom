/**
 * ProjectService Unit Tests (NestJS)
 * Migrated from Express tests
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../../src/modules/project/project.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { ProjectModule } from '../../src/modules/project/project.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UserModule } from '../../src/modules/user/user.module';
import { createNestTestingModule, cleanupNestUnitDB, closeNestUnitDB } from '../setup-nestjs-unit';
import { Project } from '../../src/modules/project/project.model';
import { User } from '../../src/modules/user/user.model';

describe('ProjectService (NestJS)', () => {
  let module: TestingModule;
  let projectService: ProjectService;
  let authService: AuthService;
  let userId: string;
  let adminId: string;

  beforeAll(async () => {
    module = await createNestTestingModule([
      UserModule,
      AuthModule,
      ProjectModule,
    ]);

    projectService = module.get<ProjectService>(ProjectService);
    authService = module.get<AuthService>(AuthService);
  });

  beforeEach(async () => {
    await cleanupNestUnitDB();

    // Create test user
    const userResult = await authService.registerUser({
      email: 'user@example.com',
      password: 'Password123',
      name: 'Test User',
    });
    userId = userResult.user._id.toString();

    // Create admin user
    const adminResult = await authService.registerUser({
      email: 'admin@example.com',
      password: 'Password123',
      name: 'Admin User',
    });
    adminId = adminResult.user._id.toString();
    const admin = await User.findById(adminId);
    if (admin) {
      admin.role = 'admin';
      await admin.save();
    }
  });

  afterEach(async () => {
    await cleanupNestUnitDB();
  });

  afterAll(async () => {
    await module.close();
    await closeNestUnitDB();
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        serviceType: 'recycling' as const,
        title: 'Test Collection',
        description: 'Test Collection Description',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
        },
        locationType: 'residential-apartment' as const,
        locationName: 'Test Apartments',
        collectionItems: [
          { materialType: 'mixed-plastic' as const, weight: 10, rate: 5 },
          { materialType: 'paper' as const, weight: 5, rate: 3 },
        ],
        gstRate: 18,
      };

      const project = await projectService.createProject(projectData, userId);

      expect(project).toHaveProperty('_id');
      expect(project.serviceType).toBe('recycling');
      expect(project.title).toBe('Test Collection');
      expect(project.userId.toString()).toBe(userId);
    });

    it('should create project with minimal data', async () => {
      const projectData = {
        serviceType: 'cctv' as const,
        title: 'Minimal Project',
        description: 'Minimal Description',
      };

      const project = await projectService.createProject(projectData, userId);

      expect(project.serviceType).toBe('cctv');
      expect(project.title).toBe('Minimal Project');
    });
  });

  describe('getUserProjects', () => {
    beforeEach(async () => {
      // Create multiple projects
      await projectService.createProject({
        serviceType: 'recycling',
        title: 'Project 1',
        description: 'Description 1',
      }, userId);
      await projectService.createProject({
        serviceType: 'cctv',
        title: 'Project 2',
        description: 'Description 2',
      }, userId);
    });

    it('should get all user projects', async () => {
      const projects = await projectService.getUserProjects(userId);

      expect(projects.length).toBeGreaterThanOrEqual(2);
      expect(projects[0].userId.toString()).toBe(userId);
    });

    it('should filter projects by service type', async () => {
      const recyclingProjects = await projectService.getUserProjects(userId, {
        serviceType: 'recycling',
      });

      expect(recyclingProjects.length).toBeGreaterThanOrEqual(1);
      expect(recyclingProjects.every((p) => p.serviceType === 'recycling')).toBe(true);
    });
  });

  describe('getProjectById', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await projectService.createProject({
        serviceType: 'recycling',
        title: 'Test Project',
        description: 'Test Description',
      }, userId);
      projectId = project._id.toString();
    });

    it('should get project by id for owner', async () => {
      const project = await projectService.getProjectById(projectId, userId);

      expect(project).toBeTruthy();
      expect(project?._id.toString()).toBe(projectId);
      expect(project?.userId.toString()).toBe(userId);
    });

    it('should return null for project not owned by user', async () => {
      const otherUser = await authService.registerUser({
        email: 'other@example.com',
        password: 'Password123',
      });

      const project = await projectService.getProjectById(
        projectId,
        otherUser.user._id.toString()
      );

      expect(project).toBeNull();
    });
  });
});
