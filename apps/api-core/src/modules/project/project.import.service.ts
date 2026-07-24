import { Project, IProject, CollectionItem } from './project.model';
import { AppError } from '../../common/exceptions/app-error';
import mongoose, { Types, Model } from 'mongoose';
import { ValidationService } from '../../common/validation/validation.service';
import { ExportService, FileFormat } from '../../infrastructure/export/export.service';
import { QueryBuilderService } from '../../infrastructure/database/query-builder.service';
import { FINANCIAL } from '../../config/constants';
import { COLLECTION_LOCATION_TYPES, CollectionLocationType, isValidMaterialType } from '../../types/collections';


const getProjectModel = (verifiedConnection?: mongoose.Connection): Model<IProject> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Project.modelName]) {
    return connection.models[Project.modelName] as Model<IProject>;
  }
  return Project as Model<IProject>;
};

// CSVRow type removed - using Record<string, string> from csvExcelUtils

interface CollectionCSVData {
  'Receipt Number'?: string;
  'Location Type': string;
  'Location Name': string;
  'Address': string;
  'City'?: string;
  'State'?: string;
  'Zip Code'?: string;
  'Collection Items': string;
  'GST Rate (%)'?: string;
  'Collection Date'?: string;
  'Created At'?: string;
  receiptNumber?: string;
  locationType?: string;
  locationName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  collectionItems?: string;
  collectionDate?: string;
  createdAt?: string;
}

interface PopulatedCollection extends Omit<IProject, 'userId' | 'collectedBy' | 'locationId'> {
  userId?: {
    _id: Types.ObjectId;
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
  collectedBy?: {
    _id: Types.ObjectId;
    name?: string;
    email?: string;
  };
  locationId?: {
    _id: Types.ObjectId;
    locationName?: string;
    locationType?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

// CSV/Excel parsing and generation now handled by csvExcelUtils

/**
 * Export collections to CSV or Excel
 */
export const exportCollections = async (
  filters?: {
    locationType?: string;
    startDate?: Date;
    endDate?: Date;
  },
  format: FileFormat = 'csv'
, verifiedConnection?: mongoose.Connection): Promise<{ data: string | Buffer; mimeType: string; extension: string }> => {
  const ProjectModel = getProjectModel(verifiedConnection);
  const query: Record<string, unknown> = {
    serviceType: 'recycling',
  };

  if (filters?.locationType) {
    query.locationType = filters.locationType;
  }

  // Use QueryBuilderService for consistent date filtering
  const queryBuilder = new QueryBuilderService();
  const dateRangeFilter = queryBuilder.buildDateRange(
    filters?.startDate ? new Date(filters.startDate) : undefined,
    filters?.endDate ? new Date(filters.endDate) : undefined,
    'collectionDate'
  );
  Object.assign(query, dateRangeFilter);

  const collections = await ProjectModel.find(query)
    .populate('userId', 'name email')
    .populate('collectedBy', 'name email')
    .populate('locationId', 'locationName locationType address city state zipCode')
    .select('-__v')
    .sort({ collectionDate: -1, createdAt: -1 })
    .lean();

  const csvData = (collections as unknown as PopulatedCollection[]).map((col: PopulatedCollection) => {
    // Format collection items
    const items = (col.collectionItems || []).map((item: CollectionItem) =>
      `${item.materialType}:${item.weight}kg@₹${item.rate}/kg`
    ).join(';');

    // Get address from locationId (populated) or location (embedded)
    const address = col.locationId?.address || col.location?.address || '';
    const city = col.locationId?.city || col.location?.city || '';
    const state = col.locationId?.state || col.location?.state || '';

    return {
      'Receipt Number': col.receiptNumber || '',
      'Location Type': col.locationType || '',
      'Location Name': col.locationName || col.locationId?.locationName || '',
      'Address': address,
      'City': city,
      'State': state,
      'Collection Items': items,
      'Total Weight (kg)': col.totalWeight || 0,
      'Subtotal (₹)': col.subTotal || 0,
      'GST Rate (%)': col.gstRate || FINANCIAL.DEFAULT_GST_RATE,
      'GST Amount (₹)': col.gstAmount || 0,
      'Total Amount (₹)': col.totalAmount || 0,
      'Collection Date': col.collectionDate ? new Date(col.collectionDate).toISOString().split('T')[0] : '',
      'Collected By': col.collectedBy?.name || col.collectedBy?.email || '',
      'Customer': col.userId?.name || col.userId?.email || '',
      'Status': col.status || '',
      'Created At': col.createdAt ? new Date(col.createdAt).toISOString().split('T')[0] : '',
    };
  });

  if (format === 'xlsx') {
    // Generate Excel with summary sheet
    const summary = [
      {
        'Total Collections': csvData.length,
        'Total Weight (kg)': csvData.reduce((sum, row) => sum + (parseFloat(String(row['Total Weight (kg)'])) || 0), 0).toFixed(2),
        'Total Amount (₹)': csvData.reduce((sum, row) => sum + (parseFloat(String(row['Total Amount (₹)'])) || 0), 0).toFixed(2),
      },
    ];

    const exportService = new ExportService();
    const buffer = exportService.generateExcel(
      csvData,
      'Collections',
      [{ name: 'Summary', data: summary }]
    );

    return {
      data: buffer,
      mimeType: exportService.getMimeType('xlsx'),
      extension: exportService.getFileExtension('xlsx'),
    };
  }

  return {
    data: (new ExportService()).stringifyCSV(csvData),
    mimeType: (new ExportService()).getMimeType('csv'),
    extension: (new ExportService()).getFileExtension('csv'),
  };
};

/**
 * Export collections to CSV (backward compatibility)
 */
export const exportCollectionsToCSV = async (filters?: {
  locationType?: string;
  startDate?: Date;
  endDate?: Date;
}, verifiedConnection?: mongoose.Connection): Promise<string> => {
  const result = await exportCollections(filters, 'csv', verifiedConnection);
  return result.data as string;
};

/**
 * Import collections from CSV or Excel (new unified function)
 *
 * Imports valid rows from the file while skipping invalid ones.
 * Only file parsing errors will fail the entire import.
 * Individual row validation errors are recorded but don't stop the import process.
 */
export const importCollections = async (
  fileData: string | Buffer,
  createdBy: string,
  filename?: string
, verifiedConnection?: mongoose.Connection): Promise<{
  success: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    collectionId?: string;
    error?: string;
  }>;
  errorReport?: string;
}> => {
  try {
    // Validate createdBy ObjectId
    const validationService = new ValidationService();
    validationService.validateObjectId(createdBy, 'createdBy');

    // Parse file - if this fails, the entire import fails (expected behavior)
    const exportService = new ExportService();
    let records: Record<string, string>[];
    if (Buffer.isBuffer(fileData)) {
      records = exportService.parseFile(fileData, filename);
    } else {
      records = exportService.parseCSV(fileData);
    }

    // Process records - invalid rows are skipped, valid ones are imported
    const result = await processCollectionRecords(records, createdBy, verifiedConnection);

    // Generate error report if there are failures
    let errorReport: string | undefined;
    if (result.failed > 0) {
      const errorRows = result.results.filter(r => !r.success);
      const errorReportData = errorRows.map(r => ({
        'Row Number': r.row,
        'Error': r.error || 'Unknown error',
      }));
      errorReport = exportService.stringifyCSV(errorReportData);
    }

    return {
      ...result,
      errorReport,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(`Import failed: ${errorMessage}`, 400);
  }
};

/**
 * Import collections from CSV (backward compatibility)
 */
export const importCollectionsFromCSV = async (
  csvData: string,
  createdBy: string
, verifiedConnection?: mongoose.Connection): Promise<{
  success: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    collectionId?: string;
    error?: string;
  }>;
}> => {
  const result = await importCollections(csvData, createdBy, undefined, verifiedConnection);
  return {
    success: result.success,
    failed: result.failed,
    results: result.results,
  };
};

/**
 * Validate import data without committing
 */
export const validateCollectionsImport = async (
  fileData: string | Buffer,
  filename?: string
, _verifiedConnection?: mongoose.Connection): Promise<{
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  preview: Array<{
    row: number;
    data: Record<string, any>;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  summary: {
    totalCollections: number;
    totalWeight: number;
    totalAmount: number;
    duplicates: number;
  };
}> => {
  const exportService = new ExportService();
  let records: Record<string, string>[];

  try {
    if (Buffer.isBuffer(fileData)) {
      records = exportService.parseFile(fileData, filename);
    } else {
      records = exportService.parseCSV(fileData);
    }
  } catch (error) {
    throw new AppError(`File parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 400);
  }

  if (records.length === 0) {
    throw new AppError('No data rows found in file', 400);
  }

  const preview: Array<{
    row: number;
    data: Record<string, any>;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> = [];

  let totalWeight = 0;
  let totalAmount = 0;
  const seenLocations = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const record: CollectionCSVData = records[i] as unknown as CollectionCSVData;
    const rowNumber = i + 2; // +2 because file is 1-indexed and has header
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      const itemsStr = record['Collection Items'] || record.collectionItems || '';
      if (!itemsStr.trim()) {
        errors.push('Collection Items is required');
      }

      const locationName = record['Location Name'] || record.locationName || '';
      if (!locationName.trim()) {
        errors.push('Location Name is required');
      }

      // Validate collection items format
      if (itemsStr.trim()) {
        const items = itemsStr.split(';').filter(item => item.trim());
        if (items.length === 0) {
          errors.push('At least one collection item is required');
        }

        items.forEach((itemStr, idx) => {
          const parts = itemStr.split('@');
          if (parts.length !== 2) {
            errors.push(`Item ${idx + 1}: Invalid format (expected: materialType:weightkg@₹rate/kg)`);
            return;
          }

          const [typeWeight, rateStr] = parts;
          const [materialType, weightStr] = typeWeight.split(':');

          if (!materialType || !weightStr || !rateStr) {
            errors.push(`Item ${idx + 1}: Missing material type, weight, or rate`);
            return;
          }

          const weight = parseFloat(weightStr.replace('kg', '').trim());
          const cleanRateStr = rateStr
            .replace(/₹/g, '')
            .replace(/â‚¹/g, '')
            .replace(/Rs\.?/gi, '')
            .replace(/INR/gi, '')
            .replace(/\/kg/gi, '')
            .trim();
          const rate = parseFloat(cleanRateStr);

          if (isNaN(weight) || weight <= 0) {
            errors.push(`Item ${idx + 1}: Invalid weight`);
          }
          if (isNaN(rate) || rate <= 0) {
            errors.push(`Item ${idx + 1}: Invalid rate`);
          }
          if (!isValidMaterialType(materialType.trim())) {
            errors.push(`Item ${idx + 1}: Invalid material type "${materialType}"`);
          } else {
            totalWeight += weight;
            totalAmount += weight * rate;
          }
        });
      }

      // Check for potential duplicates
      const locationKey = `${locationName.trim()}_${record['Address'] || record.address || ''}`.toLowerCase();
      if (seenLocations.has(locationKey)) {
        warnings.push('Potential duplicate location');
      } else {
        seenLocations.add(locationKey);
      }

      // Validate date format if provided
      const collectionDate = record['Collection Date'] || record.collectionDate;
      if (collectionDate) {
        const date = new Date(collectionDate);
        if (isNaN(date.getTime())) {
          errors.push('Invalid Collection Date format');
        }
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation error');
    }

    preview.push({
      row: rowNumber,
      data: record,
      valid: errors.length === 0,
      errors,
      warnings,
    });
  }

  const validRows = preview.filter(p => p.valid).length;
  const invalidRows = preview.filter(p => !p.valid).length;

  return {
    valid: invalidRows === 0,
    totalRows: records.length,
    validRows,
    invalidRows,
    preview,
    summary: {
      totalCollections: validRows,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      duplicates: preview.filter(p => p.warnings.some(w => w.includes('duplicate'))).length,
    },
  };
};

/**
 * Process collection records (internal function)
 *
 * Processes each row individually, skipping invalid rows and continuing with valid ones.
 * Invalid rows are recorded with error messages but don't stop the import process.
 * Only file parsing errors (handled in importCollections) will fail the entire import.
 */
const processCollectionRecords = async (
  records: Record<string, string>[],
  createdBy: string,
  verifiedConnection?: mongoose.Connection
): Promise<{
  success: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    collectionId?: string;
    error?: string;
  }>;
}> => {
  const results: Array<{
    row: number;
    success: boolean;
    collectionId?: string;
    error?: string;
  }> = [];

  const ProjectModel = getProjectModel(verifiedConnection);

  let successCount = 0;
  let failedCount = 0;

  // Process each row individually - invalid rows are skipped, valid ones are imported
  for (let i = 0; i < records.length; i++) {
    const record: CollectionCSVData = records[i] as unknown as CollectionCSVData;
    const rowNumber = i + 2; // +2 because CSV is 1-indexed and has header

    try {
      // Parse collection items from format: "mixed-plastic:10kg@₹5/kg;paper:5kg@₹3/kg"
      const itemsStr = record['Collection Items'] || record.collectionItems || '';
      const collectionItems = itemsStr.split(';').filter(item => item.trim()).map(itemStr => {
        // Format: "materialType:weightkg@₹rate/kg"
        const parts = itemStr.split('@');
        if (parts.length !== 2) {
          throw new AppError(`Invalid item format: ${itemStr}`, 400);
        }

        const [typeWeight, rateStr] = parts;
        const [materialType, weightStr] = typeWeight.split(':');

        if (!materialType || !weightStr || !rateStr) {
          throw new AppError(`Invalid item format: ${itemStr}`, 400);
        }

        const weight = parseFloat(weightStr.replace('kg', '').trim());
        // Handle multiple rupee symbol variations (₹, â‚¹, etc.)
        // Remove rupee symbol and /kg suffix, then trim
        let cleanRateStr = rateStr
          .replace(/₹/g, '') // Standard rupee symbol
          .replace(/â‚¹/g, '') // UTF-8 encoding issue variant
          .replace(/Rs\.?/gi, '') // Rs or Rs. variant
          .replace(/INR/gi, '') // INR variant
          .replace(/\/kg/gi, '') // Remove /kg suffix
          .trim();

        const rate = parseFloat(cleanRateStr);

        if (isNaN(weight) || isNaN(rate) || weight <= 0 || rate <= 0) {
          throw new AppError(`Invalid weight or rate in: ${itemStr}`, 400);
        }

        // Validate material type using centralized constant
        if (!isValidMaterialType(materialType.trim())) {
          throw new AppError(`Invalid material type: ${materialType}`, 400);
        }

        return {
          materialType: materialType.trim(),
          weight,
          rate,
          amount: weight * rate, // Calculate amount
        };
      });

      if (collectionItems.length === 0) {
        throw new AppError('At least one collection item is required', 400);
      }

      // Parse location type
      const locationType = record['Location Type'] || record.locationType;
      if (!locationType) {
        throw new AppError('Location Type is required', 400);
      }

      const validLocationTypes = Object.values(COLLECTION_LOCATION_TYPES);
      if (!validLocationTypes.includes(locationType as CollectionLocationType)) {
        throw new AppError(`Invalid location type: ${locationType}`, 400);
      }

      // Build collection data
      const collectionData: Partial<IProject> & {
        userId: Types.ObjectId;
        collectedBy: Types.ObjectId;
      } = {
        userId: new Types.ObjectId(createdBy),
        serviceType: 'recycling',
        title: `Collection - ${record['Location Name'] || record.locationName || 'Unknown'}`,
        description: `Imported collection from CSV`,
        locationType: locationType as CollectionLocationType,
        locationName: record['Location Name'] || record.locationName || '',
        location: {
          address: record['Address'] || record.address || '',
          city: record['City'] || record.city || '',
          state: record['State'] || record.state || '',
          zipCode: record['Zip Code'] || record.zipCode || '',
        },
        collectionItems: collectionItems as CollectionItem[],
        gstRate: record['GST Rate (%)']
          ? (() => {
            const parsed = parseFloat(record['GST Rate (%)']);
            return isNaN(parsed) || parsed < 0 || parsed > 100 ? 18 : parsed;
          })()
          : 18,
        collectionDate: (record['Collection Date'] || record.collectionDate)
          ? (() => {
            const dateStr = record['Collection Date'] || record.collectionDate;
            if (!dateStr) return new Date();
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? new Date() : date;
          })()
          : new Date(),
        collectedBy: new Types.ObjectId(createdBy),
        status: 'completed',
      };

      // Parse and set createdAt if provided in CSV
      const createdAtStr = record['Created At'] || record.createdAt;
      if (createdAtStr) {
        const createdAtDate = new Date(createdAtStr);
        if (!isNaN(createdAtDate.getTime())) {
          collectionData.createdAt = createdAtDate;
        }
      }

      // Validate required fields
      if (!collectionData.locationName) {
        throw new AppError('Location Name is required', 400);
      }
      if (!collectionData.location?.address) {
        throw new AppError('Address is required', 400);
      }

      // Check for duplicate collection before creating
      // Duplicate is defined as: same locationName, address, collectionDate, same items (materials, weights, rates), and same collectedBy
      const collectionDate = collectionData.collectionDate || new Date();
      const normalizedDate = new Date(collectionDate);
      normalizedDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(normalizedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Create a normalized signature of collection items for comparison
      const itemsSignature = collectionItems
        .map(item => `${item.materialType}:${item.weight}:${item.rate}`)
        .sort()
        .join(';');

      // Escape regex special characters to prevent regex injection
      const normalizedLocationName = collectionData.locationName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedAddress = collectionData.location.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const existingCollection = await ProjectModel.findOne({
        serviceType: 'recycling',
        locationName: { $regex: new RegExp(`^${normalizedLocationName}$`, 'i') },
        'location.address': { $regex: new RegExp(`^${normalizedAddress}$`, 'i') },
        collectionDate: {
          $gte: normalizedDate,
          $lt: nextDay,
        },
        collectedBy: collectionData.collectedBy,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      });

      if (existingCollection && existingCollection.collectionItems) {
        // Check if items match
        const existingItemsSignature = existingCollection.collectionItems
          .map((item: CollectionItem) => `${item.materialType}:${item.weight}:${item.rate}`)
          .sort()
          .join(';');

        if (existingItemsSignature === itemsSignature) {
          throw new AppError(
            `Duplicate collection: A collection with the same location, date, items, and collector already exists (ID: ${existingCollection._id})`,
            400
          );
        }
      }

      // Create collection
      const collection = new ProjectModel(collectionData);

      // If createdAt was set, we need to save it explicitly
      // Mongoose timestamps will override if not set before save
      if (collectionData.createdAt) {
        collection.createdAt = collectionData.createdAt;
      }

      await collection.save();

      results.push({
        row: rowNumber,
        success: true,
        collectionId: collection._id.toString(),
      });
      successCount++;
    } catch (error: unknown) {
      // Catch and record errors for this row, but continue processing remaining rows
      // This allows valid rows to be imported even if some rows are invalid
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        row: rowNumber,
        success: false,
        error: errorMessage,
      });
      failedCount++;
      // Continue to next row - don't throw, allowing valid rows to be processed
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results,
  };
};

/**
 * Get CSV import template
 */
export const getImportTemplate = (): string => {
  const template = [
    {
      'Location Type': 'residential-apartment',
      'Location Name': 'Example Apartment',
      'Address': '123 Main Street',
      'City': 'Mumbai',
      'State': 'Maharashtra',
      'Zip Code': '400001',
      'Collection Items': 'mixed-plastic:10kg@₹5/kg;paper:5kg@₹3/kg;iron:2kg@₹10/kg',
      'GST Rate (%)': '18',
      'Collection Date': new Date().toISOString().split('T')[0],
      'Created At': new Date().toISOString().split('T')[0],
    },
  ];

  return (new ExportService()).stringifyCSV(template);
};

