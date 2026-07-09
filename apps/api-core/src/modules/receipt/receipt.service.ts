import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Receipt, ReceiptDocument } from './schemas/receipt.schema';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    @InjectModel(Receipt.name) private receiptModel: Model<ReceiptDocument>,
  ) {}

  async generateReceipt(
    data: GenerateReceiptDto,
    generatedBy: string,
    req?: any,
  ): Promise<ReceiptDocument> {
    // Native Nest implementation.
    // NOTE: We intentionally avoid direct ProjectModule injection here to keep the replacement minimal.
    // Instead, use the already-registered mongoose model.
    const ProjectModel = this.receiptModel.db.model<any>('Project');
    const LocationModel = this.receiptModel.db.model<any>('Location');

    const collectionObjectId = new Types.ObjectId(data.collectionId);
    const generatedByObjectId = new Types.ObjectId(generatedBy);

    if (!/^\d{12}$/.test(String(data.upiTransactionId || '').trim())) {
      throw new BadRequestException('UPI Transaction ID/UTR must be exactly 12 digits');
    }

    const collection = await ProjectModel.findOne({
      _id: collectionObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).lean<any>().exec();

    if (!collection) {
      throw new BadRequestException('Collection not found');
    }

    // Prevent duplicate receipts for same collection
    const existing = await this.receiptModel.findOne({ collectionId: collectionObjectId }).exec();
    if (existing) {
      return existing;
    }

    // Resolve location fields for PDF
    let locationDoc: any = null;
    if (collection.locationId) {
      locationDoc = await LocationModel.findOne({
        _id: collection.locationId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      }).lean<any>().exec();
    }

    const receiptNumber = await this.generateReceiptNumber();

    const receipt = new this.receiptModel({
      receiptNumber,
      collectionId: collectionObjectId,
      companyName: 'Ever Blooming Recycling Solutions Pvt ltd',
      locationType: collection.locationType || locationDoc?.locationType,
      locationName: collection.locationName || locationDoc?.locationName,
      address: locationDoc
        ? {
          address: locationDoc.address,
          city: locationDoc.city,
          state: locationDoc.state,
          zipCode: locationDoc.zipCode,
        }
        : collection.location,
      collectionItems: collection.collectionItems || [],
      totalWeight: collection.totalWeight || 0,
      subTotal: collection.subTotal || 0,
      gstRate: collection.gstRate || 0,
      gstAmount: collection.gstAmount || 0,
      totalAmount: collection.totalAmount || 0,
      collectionDate: collection.collectionDate || collection.createdAt || new Date(),
      generatedBy: generatedByObjectId,
      upiTransactionId: String(data.upiTransactionId).trim(),
    });

    // Best-effort: persist receiptNumber into Project if schema supports it.
    // Do not hard-fail if Project schema differs.
    try {
      await ProjectModel.updateOne(
        { _id: collectionObjectId },
        {
          $set: {
            receiptNumber,
            upiTransactionId: String(data.upiTransactionId).trim(),
          },
        },
      ).exec();
    } catch (_error) {
      // ignore
    }

    const saved = await receipt.save();
    this.logger.log(`Receipt generated for collection=${data.collectionId} receiptNumber=${receiptNumber}`);
    return saved;
  }

  private async generateReceiptNumber(): Promise<string> {
    // Format: EBR-YYYYMMDD-XXXX (XXXX incremental per day)
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const datePart = `${y}${m}${d}`;
    const prefix = `EBR-${datePart}-`;

    const last = await this.receiptModel
      .findOne({ receiptNumber: { $regex: `^${prefix}` } })
      .sort({ createdAt: -1 })
      .select('receiptNumber')
      .lean();

    const lastSeq = last?.receiptNumber?.startsWith(prefix)
      ? parseInt(last.receiptNumber.slice(prefix.length), 10)
      : 0;

    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    const seqPart = String(nextSeq).padStart(4, '0');
    return `${prefix}${seqPart}`;
  }

  async getReceiptById(receiptId: string): Promise<ReceiptDocument | null> {
    if (!Types.ObjectId.isValid(receiptId)) return null;
    return this.receiptModel.findById(new Types.ObjectId(receiptId)).exec();
  }

  async getReceiptByNumber(receiptNumber: string): Promise<ReceiptDocument | null> {
    return this.receiptModel.findOne({ receiptNumber: String(receiptNumber).trim() }).exec();
  }

  async getReceiptByCollectionId(collectionId: string): Promise<ReceiptDocument | null> {
    if (!Types.ObjectId.isValid(collectionId)) return null;
    return this.receiptModel.findOne({ collectionId: new Types.ObjectId(collectionId) }).exec();
  }

  async getAllReceipts(
    filters: ReceiptQueryDto & { userId?: string; userRole?: string },
  ): Promise<any> {
    const page = Math.max(Number(filters.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit || 10), 1), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.search) {
      const s = String(filters.search).trim();
      if (s) {
        query.$or = [
          { receiptNumber: { $regex: s, $options: 'i' } },
          { locationName: { $regex: s, $options: 'i' } },
          { upiTransactionId: { $regex: s, $options: 'i' } },
        ];
      }
    }

    if (filters.startDate || filters.endDate) {
      const dateQuery: Record<string, unknown> = {};
      if (filters.startDate) dateQuery.$gte = new Date(filters.startDate);
      if (filters.endDate) dateQuery.$lte = new Date(filters.endDate);
      query.collectionDate = dateQuery;
    }

    // Role-based filtering (agent/user see only their receipts)
    if (filters.userRole === 'agent' && filters.userId && Types.ObjectId.isValid(filters.userId)) {
      query.generatedBy = new Types.ObjectId(filters.userId);
    }

    // For 'user' role, we filter by the user's default location via Project linkage.
    // Minimal approach: if caller is user, only return receipts for projects at user's defaultLocation.
    if (filters.userRole === 'user' && filters.userId && Types.ObjectId.isValid(filters.userId)) {
      const UserModel = this.receiptModel.db.model<any>('User');
      const ProjectModel = this.receiptModel.db.model<any>('Project');
      const user = await UserModel
        .findById(new Types.ObjectId(filters.userId))
        .select('defaultLocation')
        .lean<any>()
        .exec();
      const defaultLocationId = user?.defaultLocation;
      if (!defaultLocationId) {
        return { receipts: [], total: 0, page, limit, totalPages: 1 };
      }
      const projectIds = await ProjectModel.find({
        locationId: defaultLocationId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      })
        .select('_id')
        .lean<any>()
        .exec();
      query.collectionId = { $in: projectIds.map((p: any) => p._id) };
    }

    const [receipts, total] = await Promise.all([
      this.receiptModel
        .find(query)
        .sort({ generatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.receiptModel.countDocuments(query),
    ]);

    return {
      receipts,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async checkUserReceiptAccess(userId: string, receipt: ReceiptDocument): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const UserModel = this.receiptModel.db.model<any>('User');
    const ProjectModel = this.receiptModel.db.model<any>('Project');
    const user = await UserModel
      .findById(new Types.ObjectId(userId))
      .select('defaultLocation')
      .lean<any>()
      .exec();
    const defaultLocationId = user?.defaultLocation;
    if (!defaultLocationId) return false;

    const project = await ProjectModel.findOne({
      _id: receipt.collectionId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    })
      .select('locationId')
      .lean<any>()
      .exec();

    if (!project?.locationId) return false;
    return String(project.locationId) === String(defaultLocationId);
  }

  async updateReceiptPdfUrl(receiptId: string, pdfUrl: string): Promise<void> {
    if (!Types.ObjectId.isValid(receiptId)) {
      throw new BadRequestException('Invalid receiptId');
    }
    await this.receiptModel.updateOne(
      { _id: new Types.ObjectId(receiptId) },
      { $set: { pdfUrl: String(pdfUrl) } },
    ).exec();
  }

  // Get the Mongoose model instance (for compatibility)
  getModel(): Model<ReceiptDocument> {
    return this.receiptModel;
  }
}
