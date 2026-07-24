import { CreateLocationData } from './location.service';
import * as bulkLocationService from './location.bulk.service';
import {Location, ILocation} from './location.model';
import { AppError } from '../../common/exceptions/app-error';
import { CollectionLocationType, COLLECTION_LOCATION_TYPES } from '../../types/collections';
import mongoose, { Types, Model } from 'mongoose';
import { ExportService, FileFormat } from '../../infrastructure/export/export.service';


const getLocationModel = (verifiedConnection?: mongoose.Connection): Model<ILocation> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Location.modelName]) {
    return connection.models[Location.modelName] as Model<ILocation>;
  }
  return Location as Model<ILocation>;
};

/**
 * Export locations to CSV or Excel
 */
export const exportLocations = async (
  filters?: {
    locationType?: string;
    city?: string;
    state?: string;
    isActive?: boolean;
  },
  format: FileFormat = 'csv'
, verifiedConnection?: mongoose.Connection): Promise<{ data: string | Buffer; mimeType: string; extension: string }> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const query: Record<string, unknown> = {
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  };

  if (filters?.locationType) {
    query.locationType = filters.locationType;
  }
  if (filters?.city) {
    query.city = { $regex: filters.city, $options: 'i' };
  }
  if (filters?.state) {
    query.state = { $regex: filters.state, $options: 'i' };
  }
  if (filters?.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  const locations = await LocationModel.find(query)
    .populate('createdBy', 'name email')
    .select('-__v')
    .lean();

  interface LocationLean {
    _id: Types.ObjectId;
    locationType: string;
    locationName: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    usageCount?: number;
    lastUsedAt?: Date;
    isActive: boolean;
    tags?: string[];
    group?: string;
    notes?: string;
    createdBy?: {
      _id: Types.ObjectId;
      email?: string;
    };
    createdAt: Date;
  }

  const exportService = new ExportService();
  const csvData = locations.map((loc: LocationLean) => ({
    'Location Type': loc.locationType,
    'Location Name': loc.locationName,
    'Address': loc.address,
    'City': loc.city || '',
    'State': loc.state || '',
    'Zip Code': loc.zipCode || '',
    'Usage Count': loc.usageCount || 0,
    'Last Used': loc.lastUsedAt ? new Date(loc.lastUsedAt).toISOString().split('T')[0] : '',
    'Status': loc.isActive ? 'Active' : 'Inactive',
    'Tags': (loc.tags || []).join(';'),
    'Group': loc.group || '',
    'Notes': loc.notes || '',
    'Created By': loc.createdBy?.email || '',
    'Created At': loc.createdAt ? new Date(loc.createdAt).toISOString().split('T')[0] : '',
  }));

  if (format === 'xlsx') {
    // Generate Excel with summary sheet
    const summary = [
      {
        'Total Locations': csvData.length,
        'Active Locations': csvData.filter((row: any) => row['Status'] === 'Active').length,
        'Inactive Locations': csvData.filter((row: any) => row['Status'] === 'Inactive').length,
        'Total Usage Count': csvData.reduce((sum: number, row: any) => sum + (parseInt(String(row['Usage Count'])) || 0), 0),
      },
    ];

    const buffer = exportService.generateExcel(
      csvData,
      'Locations',
      [{ name: 'Summary', data: summary }]
    );

    return {
      data: buffer,
      mimeType: exportService.getMimeType('xlsx'),
      extension: exportService.getFileExtension('xlsx'),
    };
  }

  return {
    data: exportService.stringifyCSV(csvData),
    mimeType: exportService.getMimeType('csv'),
    extension: exportService.getFileExtension('csv'),
  };
};

/**
 * Export locations to CSV (backward compatibility)
 */
export const exportLocationsToCSV = async (filters?: {
  locationType?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
}, verifiedConnection?: mongoose.Connection): Promise<string> => {
  const result = await exportLocations(filters, 'csv', verifiedConnection);
  return result.data as string;
};

/**
 * Validate import data without committing
 */
export const validateLocationsImport = async (
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
    totalLocations: number;
    duplicates: number;
  };
}> => {
  let records: Record<string, string>[];

  try {
    if (Buffer.isBuffer(fileData)) {
      const exportService = new ExportService();
      records = exportService.parseFile(fileData, filename);
    } else {
      const exportService = new ExportService();
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

  const seenLocations = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2; // +2 because file is 1-indexed and has header
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      const locationType = record['Location Type'] || record.locationType;
      if (!locationType) {
        errors.push('Location Type is required');
      } else {
        const validTypes = Object.values(COLLECTION_LOCATION_TYPES);
        if (!validTypes.includes(locationType as CollectionLocationType)) {
          errors.push(`Invalid location type: ${locationType}`);
        }
      }

      const locationName = record['Location Name'] || record.locationName;
      if (!locationName || !locationName.trim()) {
        errors.push('Location Name is required');
      }

      const address = record['Address'] || record.address;
      if (!address || !address.trim()) {
        errors.push('Address is required');
      }

      // Check for potential duplicates
      const locationKey = `${locationName?.trim()}_${address?.trim()}_${locationType}`.toLowerCase();
      if (seenLocations.has(locationKey)) {
        warnings.push('Potential duplicate location');
      } else {
        seenLocations.add(locationKey);
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
      totalLocations: validRows,
      duplicates: preview.filter(p => p.warnings.some(w => w.includes('duplicate'))).length,
    },
  };
};

/**
 * Import locations from CSV or Excel
 */
export const importLocations = async (
  fileData: string | Buffer,
  createdBy: string,
  filename?: string
, verifiedConnection?: mongoose.Connection): Promise<{
  success: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    locationId?: string;
    error?: string;
  }>;
  errorReport?: string;
}> => {
  let records: Record<string, string>[];

  try {
    if (Buffer.isBuffer(fileData)) {
      const exportService = new ExportService();
      records = exportService.parseFile(fileData, filename);
    } else {
      const exportService = new ExportService();
      records = exportService.parseCSV(fileData);
    }
  } catch (error) {
    throw new AppError(`File parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 400);
  }

  const result = await processLocationRecords(records, createdBy, verifiedConnection);

  // Generate error report if there are failures
  let errorReport: string | undefined;
  if (result.failed > 0) {
    const errorRows = result.results.filter(r => !r.success);
    const errorReportData = errorRows.map(r => ({
      'Row Number': r.row,
      'Error': r.error || 'Unknown error',
    }));
    const exportService = new ExportService();
    errorReport = exportService.stringifyCSV(errorReportData);
  }

  return {
    ...result,
    errorReport,
  };
};

/**
 * Import locations from CSV (backward compatibility)
 */
export const importLocationsFromCSV = async (
  csvData: string,
  createdBy: string
, verifiedConnection?: mongoose.Connection): Promise<{
  success: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    locationId?: string;
    error?: string;
  }>;
}> => {
  const result = await importLocations(csvData, createdBy, undefined, verifiedConnection);
  return {
    success: result.success,
    failed: result.failed,
    results: result.results,
  };
};

/**
 * Process location records (internal function)
 */
const processLocationRecords = async (
  records: Record<string, string>[],
  createdBy: string,
  verifiedConnection?: mongoose.Connection
): Promise<{
  success: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    locationId?: string;
    error?: string;
  }>;
}> => {
  try {

    interface LocationCSVRecord {
      'Location Type'?: string;
      'Location Name'?: string;
      'Locality'?: string;
      'Address'?: string;
      'City'?: string;
      'State'?: string;
      'Zip Code'?: string;
      'Tags'?: string;
      'Group'?: string;
      'Notes'?: string;
      'Last Used'?: string;
      'Created At'?: string;
      locationType?: string;
      locationName?: string;
      locality?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      tags?: string;
      group?: string;
      notes?: string;
      lastUsed?: string;
      lastUsedAt?: string;
      createdAt?: string;
    }

    const locations: Array<CreateLocationData & { lastUsedAt?: Date; createdAt?: Date }> = records.map((record: LocationCSVRecord) => {
      const locationData: CreateLocationData & { lastUsedAt?: Date; createdAt?: Date } = {
        locationType: (record['Location Type'] || record.locationType) as any as CollectionLocationType,
        locationName: record['Location Name'] || record.locationName || '',
        locality: record['Locality'] || record.locality || record['City'] || record.city || '',
        address: record['Address'] || record.address || '',
        city: record['City'] || record.city || undefined,
        state: record['State'] || record.state || undefined,
        zipCode: record['Zip Code'] || record.zipCode || undefined,
        tags: record['Tags'] ? String(record['Tags']).split(';').filter((t: string) => t.trim()).map((t: string) => t.trim()) : undefined,
        group: record['Group'] || record.group || undefined,
        notes: record['Notes'] || record.notes || undefined,
      };

      // Parse lastUsedAt if provided
      const lastUsedStr = record['Last Used'] || record.lastUsed || record.lastUsedAt;
      if (lastUsedStr) {
        const lastUsedDate = new Date(lastUsedStr);
        if (!isNaN(lastUsedDate.getTime())) {
          locationData.lastUsedAt = lastUsedDate;
        }
      }

      // Parse createdAt if provided
      const createdAtStr = record['Created At'] || record.createdAt;
      if (createdAtStr) {
        const createdAtDate = new Date(createdAtStr);
        if (!isNaN(createdAtDate.getTime())) {
          locationData.createdAt = createdAtDate;
        }
      }

      return locationData;
    });

    // Validate (strip extra fields for validation)
    const locationsForValidation: CreateLocationData[] = locations.map(loc => ({
      locationType: loc.locationType,
      locationName: loc.locationName,
      locality: loc.locality,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      zipCode: loc.zipCode,
      tags: loc.tags,
      group: loc.group,
      notes: loc.notes,
    }));
    const validation = bulkLocationService.validateBulkLocations(locationsForValidation);
    if (!validation.valid) {
      throw new AppError(`Validation failed: ${validation.errors.length} error(s)`, 400);
    }

    // Bulk create
    const result = await bulkLocationService.bulkCreateLocations(locations, createdBy, verifiedConnection);

    return {
      success: result.success,
      failed: result.failed,
      results: result.results.map(r => ({
        row: r.index + 1, // CSV rows are 1-indexed
        success: r.success,
        locationId: r.locationId,
        error: r.error,
      })),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'CSV import failed';
    throw new AppError(`CSV import failed: ${errorMessage}`, 400);
  }
};

/**
 * Get CSV import template
 */
export const getImportTemplate = (): string => {
  const template = [
    {
      'Location Type': 'residential-apartment',
      'Location Name': 'Example Apartments',
      'Address': '123 Main Street',
      'City': 'Mumbai',
      'State': 'Maharashtra',
      'Zip Code': '400001',
      'Tags': 'Premium;High Volume',
      'Group': 'Premium',
      'Notes': 'Special instructions here',
      'Last Used': new Date().toISOString().split('T')[0],
      'Created At': new Date().toISOString().split('T')[0],
    },
  ];

  return (new ExportService()).stringifyCSV(template);
};

