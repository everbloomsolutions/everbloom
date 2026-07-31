/**
 * Receipt Generation Integration Tests (NestJS)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Model } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import '../env-setup';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../setup';
import { DatabaseModule } from '../../src/infrastructure/database/database.module';
import { ReceiptModule } from '../../src/modules/receipt/receipt.module';
import { ReceiptService } from '../../src/modules/receipt/receipt.service';
import { Receipt, ReceiptDocument } from '../../src/modules/receipt/schemas/receipt.schema';
import { Project, ProjectDocument } from '../../src/modules/project/schemas/project.schema';

const makeProject = (projectModel: Model<ProjectDocument>, overrides = {}) => {
  return projectModel.create({
    userId: new mongoose.Types.ObjectId(),
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

describe('Receipt Generation Integration Tests (NestJS)', () => {
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

  afterAll(async () => {
    await module.close();
    await closeTestDB();
  });

  beforeEach(async () => {
    await cleanupTestDB();
    await receiptModel.deleteMany({});
    await projectModel.deleteMany({});
  });

  it('should generate unique receipt numbers atomically', async () => {
    const project = await makeProject(projectModel);
    const generatedBy = new mongoose.Types.ObjectId().toString();
    const upi = '123456789012';

    const promises = Array.from({ length: 5 }, () =>
      receiptService.generateReceipt(
        { collectionId: project._id.toString(), upiTransactionId: upi },
        generatedBy,
      ),
    );

    const results = await Promise.allSettled(promises);
    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<ReceiptDocument> => r.status === 'fulfilled')
      .map((r) => r.value);

    expect(fulfilled.length).toBe(1);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected.length).toBe(4);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    const receiptNumbers = fulfilled.map((r) => r.receiptNumber);
    const uniqueNumbers = new Set(receiptNumbers);
    expect(uniqueNumbers.size).toBe(receiptNumbers.length);

    const receipts = await receiptModel.find({ collectionId: project._id });
    expect(receipts.length).toBe(1);
  });

  it('should fail when collection does not exist', async () => {
    const deletedId = new mongoose.Types.ObjectId().toString();
    const generatedBy = new mongoose.Types.ObjectId().toString();

    await expect(
      receiptService.generateReceipt(
        { collectionId: deletedId, upiTransactionId: '123456789012' },
        generatedBy,
      ),
    ).rejects.toThrow();

    const receipts = await receiptModel.find({ collectionId: deletedId });
    expect(receipts.length).toBe(0);
  });

  it('should reject duplicate receipt requests with 409', async () => {
    const project = await makeProject(projectModel);
    const generatedBy = new mongoose.Types.ObjectId().toString();
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

    const receipts = await receiptModel.find({ collectionId: project._id });
    expect(receipts.length).toBe(1);
  });
});
