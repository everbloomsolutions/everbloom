/**
 * Receipt Generation Integration Tests (NestJS)
 * Migrated from Express tests
 * 
 * Tests critical receipt generation flow including:
 * - Atomic receipt number generation
 * - Database transactions
 * - Error handling and rollback
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Receipt } from '../../src/modules/receipt/receipt.model';
import { Project } from '../../src/modules/project/project.model';
import { ReceiptSequence } from '../../src/modules/receipt/receipt-sequence.model';
import { generateReceipt } from '../../src/modules/receipt/receipt.service';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../setup';

describe('Receipt Generation Integration Tests (NestJS)', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await cleanupTestDB();
    // Clean up test data
    await Receipt.deleteMany({});
    await ReceiptSequence.deleteMany({});
    await Project.deleteMany({});
  });

  it('should generate unique receipt numbers atomically', async () => {
    // Create test project
    const project = await Project.create({
      userId: new mongoose.Types.ObjectId(),
      serviceType: 'recycling',
      title: 'Test Collection',
      description: 'Test description',
      collectionItems: [{
        materialType: 'paper',
        weight: 10,
        rate: 5,
        amount: 50,
      }],
      totalWeight: 10,
      subTotal: 50,
      gstRate: 18,
      gstAmount: 9,
      totalAmount: 59,
    });

    // Generate receipts concurrently
    const promises = Array.from({ length: 5 }, () =>
      generateReceipt({
        collectionId: project._id.toString(),
        generatedBy: new mongoose.Types.ObjectId().toString(),
        upiTransactionId: '123456789012',
      })
    );

    const receipts = await Promise.all(promises);

    // Verify all receipts have unique numbers
    const receiptNumbers = receipts.map(r => r.receiptNumber);
    const uniqueNumbers = new Set(receiptNumbers);
    expect(uniqueNumbers.size).toBe(receiptNumbers.length);

    // Verify sequence counter was incremented correctly
    const sequence = await ReceiptSequence.findOne({
      date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    });
    expect(sequence?.sequence).toBeGreaterThanOrEqual(5);
  });

  it('should rollback transaction on error', async () => {
    const project = await Project.create({
      userId: new mongoose.Types.ObjectId(),
      serviceType: 'recycling',
      title: 'Test Collection',
      description: 'Test description',
      collectionItems: [{
        materialType: 'paper',
        weight: 10,
        rate: 5,
        amount: 50,
      }],
    });

    // Delete project to cause error
    await Project.findByIdAndDelete(project._id);

    // Attempt to generate receipt - should fail
    await expect(
      generateReceipt({
        collectionId: project._id.toString(),
        generatedBy: new mongoose.Types.ObjectId().toString(),
        upiTransactionId: '123456789012',
      })
    ).rejects.toThrow();

    // Verify no receipt was created
    const receipts = await Receipt.find({ collectionId: project._id });
    expect(receipts.length).toBe(0);
  });

  it('should return existing receipt if already generated', async () => {
    const project = await Project.create({
      userId: new mongoose.Types.ObjectId(),
      serviceType: 'recycling',
      title: 'Test Collection',
      description: 'Test description',
      collectionItems: [{
        materialType: 'paper',
        weight: 10,
        rate: 5,
        amount: 50,
      }],
    });

    const generatedBy = new mongoose.Types.ObjectId().toString();

    // Generate first receipt
    const receipt1 = await generateReceipt({
      collectionId: project._id.toString(),
      generatedBy,
      upiTransactionId: '123456789012',
    });

    // Generate again - should return same receipt
    const receipt2 = await generateReceipt({
      collectionId: project._id.toString(),
      generatedBy,
      upiTransactionId: '123456789012',
    });

    expect(receipt1._id.toString()).toBe(receipt2._id.toString());
    expect(receipt1.receiptNumber).toBe(receipt2.receiptNumber);

    // Verify only one receipt exists
    const receipts = await Receipt.find({ collectionId: project._id });
    expect(receipts.length).toBe(1);
  });
});
