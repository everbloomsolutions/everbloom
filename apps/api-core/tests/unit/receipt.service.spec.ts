/**
 * ReceiptService Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConflictException, BadRequestException } from '@nestjs/common';
import '../env-setup';
import { ReceiptModule } from '../../src/modules/receipt/receipt.module';
import { ReceiptService } from '../../src/modules/receipt/receipt.service';
import { Receipt, ReceiptDocument } from '../../src/modules/receipt/schemas/receipt.schema';
import { Project, ProjectDocument } from '../../src/modules/project/schemas/project.schema';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../setup';
import { DatabaseModule } from '../../src/infrastructure/database/database.module';

const makeProject = async (projectModel: Model<ProjectDocument>, overrides = {}) => {
  return projectModel.create({
    userId: new (await import('mongoose')).Types.ObjectId(),
    serviceType: 'recycling',
    title: 'Test Collection',
    description: 'Test description',
    status: 'completed',
    priority: 'medium',
    location: { address: 'Test Address' },
    collectionItems: [
      { materialType: 'paper', weight: 10, rate: 5, amount: 50 },
    ],
    totalWeight: 10,
    subTotal: 50,
    gstRate: 18,
    gstAmount: 9,
    totalAmount: 59,
    ...overrides,
  });
};

describe('ReceiptService', () => {
  let module: TestingModule;
  let receiptService: ReceiptService;
  let receiptModel: Model<ReceiptDocument>;
  let projectModel: Model<ProjectDocument>;

  beforeAll(async () => {
    await setupTestDB();

    module = await Test.createTestingModule({
      imports: [DatabaseModule, ReceiptModule],
    }).compile();

    receiptService = module.get<ReceiptService>(ReceiptService);
    receiptModel = module.get<Model<ReceiptDocument>>(getModelToken(Receipt.name));
    projectModel = module.get<Model<ProjectDocument>>(getModelToken(Project.name));
  });

  beforeEach(async () => {
    await cleanupTestDB();
    await receiptModel.deleteMany({});
    await projectModel.deleteMany({});
  });

  afterAll(async () => {
    await module.close();
    await closeTestDB();
  });

  describe('generateReceipt', () => {
    it('should generate a receipt for a valid collection and UTR', async () => {
      const project = await makeProject(projectModel);
      const generatedBy = new (await import('mongoose')).Types.ObjectId().toString();

      const receipt = await receiptService.generateReceipt(
        { collectionId: project._id.toString(), upiTransactionId: '123456789012' },
        generatedBy,
      );

      expect(receipt).toHaveProperty('receiptNumber');
      expect(receipt.collectionId.toString()).toBe(project._id.toString());
      expect(receipt.upiTransactionId).toBe('123456789012');
    });

    it('should throw BadRequestException for non-numeric UTR', async () => {
      const project = await makeProject(projectModel);
      const generatedBy = new (await import('mongoose')).Types.ObjectId().toString();

      await expect(
        receiptService.generateReceipt(
          { collectionId: project._id.toString(), upiTransactionId: 'not-a-number' },
          generatedBy,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for UTR with fewer than 12 digits', async () => {
      const project = await makeProject(projectModel);
      const generatedBy = new (await import('mongoose')).Types.ObjectId().toString();

      await expect(
        receiptService.generateReceipt(
          { collectionId: project._id.toString(), upiTransactionId: '12345' },
          generatedBy,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when a receipt already exists for the collection', async () => {
      const project = await makeProject(projectModel);
      const generatedBy = new (await import('mongoose')).Types.ObjectId().toString();
      const upi = '123456789012';

      await receiptService.generateReceipt(
        { collectionId: project._id.toString(), upiTransactionId: upi },
        generatedBy,
      );

      await expect(
        receiptService.generateReceipt(
          { collectionId: project._id.toString(), upiTransactionId: upi },
          generatedBy,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
