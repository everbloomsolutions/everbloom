import {Location, ILocation} from './location.model';
import { CreateLocationData } from './location.service';
import {Project, IProject} from '../project/project.model';
import mongoose, { Types, Model } from 'mongoose';
import { AppError } from '../../common/exceptions/app-error';
import { ValidationService } from '../../common/validation/validation.service';



const getProjectModel = (verifiedConnection?: mongoose.Connection): Model<IProject> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Project.modelName]) {
    return connection.models[Project.modelName] as Model<IProject>;
  }
  return Project as Model<IProject>;
};

const getLocationModel = (verifiedConnection?: mongoose.Connection): Model<ILocation> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Location.modelName]) {
    return connection.models[Location.modelName] as Model<ILocation>;
  }
  return Location as Model<ILocation>;
};

 const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

 const normalizeTextKey = (value: string): string => {
   return String(value || '')
     .trim()
     .toLowerCase()
     .replace(/\s+/g, ' ');
 };

/**
 * Calculate similarity between two strings (Levenshtein distance)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
};

/**
 * Levenshtein distance algorithm
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Check for duplicate locations using fuzzy matching
 */
interface LocationLean {
  _id: Types.ObjectId;
  locationName: string;
  address: string;
  locationType: string;
  city?: string;
  state?: string;
  zipCode?: string;
  usageCount?: number;
  lastUsedAt?: Date;
}

interface DuplicateResult {
  location: LocationLean;
  similarity: number;
  matchReason: string;
}

export const checkForDuplicates = async (
  locationData: CreateLocationData,
  threshold: number = 0.8
, verifiedConnection?: mongoose.Connection): Promise<DuplicateResult[]> => {
  const LocationModel = getLocationModel(verifiedConnection);
  try {
    const locationName = typeof locationData?.locationName === 'string' ? locationData.locationName.trim() : '';
    const address = typeof locationData?.address === 'string' ? locationData.address.trim() : '';
    const locationType = typeof locationData?.locationType === 'string' ? locationData.locationType.trim() : '';

    // Location create modal may call duplicate-check while user is still typing.
    // Treat incomplete payload as "no duplicates" instead of throwing a 500.
    if (!locationName || !address || !locationType) {
      return [];
    }

    // Optimize: Use text search to find potential matches first, then filter by similarity
    // This avoids loading all locations into memory
    const searchQuery = `${locationName} ${address}`;

    // First, get potential matches using text search (limited to 50 for performance)
    let potentialMatches: LocationLean[] = [];
    try {
      potentialMatches = await LocationModel.find({
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
        locationType,
        $text: { $search: searchQuery },
      })
        .select('locationName address locationType city state zipCode usageCount lastUsedAt')
        .limit(50) // Limit to top 50 matches for performance
        .lean();
    } catch (_error) {
      // In production environments, MongoDB text indexes may not be present (autoIndex off),
      // which would cause $text queries to throw and break the admin UI with a 500.
      // We intentionally fall back to regex-based matching below.
      potentialMatches = [];
    }

    // If no text matches, fall back to checking locations with similar name/address patterns
    // Use regex to find locations with similar names (first 3+ characters match)
    const namePrefix = locationName.substring(0, Math.min(10, locationName.length));
    const addressPrefix = address.substring(0, Math.min(20, address.length));

    const regexMatches = potentialMatches.length === 0
      ? await LocationModel.find({
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
        locationType,
        $or: [
          { locationName: { $regex: `^${escapeRegex(namePrefix)}`, $options: 'i' } },
          { address: { $regex: `^${escapeRegex(addressPrefix)}`, $options: 'i' } },
        ],
      })
        .select('locationName address locationType city state zipCode usageCount lastUsedAt')
        .limit(50)
        .lean()
      : [];

    const locationsToCheck = potentialMatches.length > 0 ? potentialMatches : regexMatches;
    const duplicates: DuplicateResult[] = [];

    for (const location of locationsToCheck) {
      let maxSimilarity = 0;
      let matchReason = '';

      // Check name similarity
      const nameSimilarity = calculateSimilarity(
        locationName,
        location.locationName
      );

      // Check address similarity
      const addressSimilarity = calculateSimilarity(
        address,
        location.address
      );

      // Combined similarity (weighted)
      const combinedSimilarity = (nameSimilarity * 0.6) + (addressSimilarity * 0.4);

      if (combinedSimilarity >= threshold) {
        maxSimilarity = combinedSimilarity;
        if (nameSimilarity >= threshold && addressSimilarity >= threshold) {
          matchReason = 'Name and address match';
        } else if (nameSimilarity >= threshold) {
          matchReason = 'Name matches';
        } else {
          matchReason = 'Address matches';
        }

        duplicates.push({
          location,
          similarity: Math.round(maxSimilarity * 100) / 100,
          matchReason,
        });
      }
    }

    // Sort by similarity descending
    return duplicates.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to check for duplicates';
    throw new AppError(`Error checking for duplicate locations: ${errorMessage}`, 500);
  }
};

 type ArchiveDuplicatesMode = 'dry-run' | 'apply';

 export interface LocationDuplicateGroupReport {
   key: string;
   keepId: string;
   archivedIds: string[];
   skippedIds: string[];
 }

 export interface ArchiveDuplicateLocationsReport {
   groups: LocationDuplicateGroupReport[];
   totals: {
     groups: number;
     candidates: number;
     archived: number;
     skipped: number;
   };
 }

 export const archiveDuplicateLocations = async (params: {
   mode: ArchiveDuplicatesMode;
   limitGroups?: number;
 }, verifiedConnection?: mongoose.Connection): Promise<ArchiveDuplicateLocationsReport> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const ProjectModel = getProjectModel(verifiedConnection);
   const { mode, limitGroups } = params;

   const locations = await LocationModel.find({
     isDeleted: { $ne: true },
     deletedAt: { $exists: false },
   })
     .select('_id locationType locationName locality address usageCount lastUsedAt createdAt')
     .lean();

   const groupsByKey = new Map<string, Array<any>>();
   for (const loc of locations) {
     const key = [
       normalizeTextKey(loc.locationType),
       normalizeTextKey(loc.locationName),
       normalizeTextKey(loc.locality),
       normalizeTextKey(loc.address),
     ].join('|');
     const existing = groupsByKey.get(key) || [];
     existing.push(loc);
     groupsByKey.set(key, existing);
   }

   const duplicateGroups = Array.from(groupsByKey.entries())
     .filter(([, items]) => items.length > 1)
     .slice(0, typeof limitGroups === 'number' ? Math.max(0, limitGroups) : undefined);

   const report: ArchiveDuplicateLocationsReport = {
     groups: [],
     totals: {
       groups: duplicateGroups.length,
       candidates: 0,
       archived: 0,
       skipped: 0,
     },
   };

   for (const [key, items] of duplicateGroups) {
     // Choose canonical by highest usageCount, then most recent lastUsedAt, then oldest createdAt.
     const sorted = [...items].sort((a, b) => {
       const usageDiff = (b.usageCount || 0) - (a.usageCount || 0);
       if (usageDiff !== 0) return usageDiff;
       const lastUsedDiff = (b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0)
         - (a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0);
       if (lastUsedDiff !== 0) return lastUsedDiff;
       const createdDiff = (a.createdAt ? new Date(a.createdAt).getTime() : 0)
         - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
       return createdDiff;
     });

     const keep = sorted[0];
     const rest = sorted.slice(1);
     report.totals.candidates += rest.length;

     const groupReport: LocationDuplicateGroupReport = {
       key,
       keepId: String(keep._id),
       archivedIds: [],
       skippedIds: [],
     };

     for (const dup of rest) {
       const dupId = dup._id;
       const activeCollectionCount = await ProjectModel.countDocuments({
         locationId: dupId,
         isDeleted: { $ne: true },
         deletedAt: { $exists: false },
       });

       if (activeCollectionCount > 0) {
         groupReport.skippedIds.push(String(dupId));
         report.totals.skipped += 1;
         continue;
       }

       groupReport.archivedIds.push(String(dupId));
       report.totals.archived += 1;

       if (mode === 'apply') {
         await LocationModel.updateOne(
           { _id: dupId },
           { $set: { isDeleted: true, deletedAt: new Date() } },
         );
       }
     }

     report.groups.push(groupReport);
   }

   return report;
 };

/**
 * Suggest merging two locations
 */
export const suggestMerge = async (
  locationId1: string,
  locationId2: string
, verifiedConnection?: mongoose.Connection): Promise<{
  source: Record<string, unknown>;
  target: Record<string, unknown>;
  conflicts: string[];
  recommendation: string;
}> => {
  const LocationModel = getLocationModel(verifiedConnection);
  try {
    const validationService = new ValidationService();
    const locationObjectId1 = validationService.validateObjectId(locationId1, 'locationId1');
    const locationObjectId2 = validationService.validateObjectId(locationId2, 'locationId2');

    const [location1, location2] = await Promise.all([
      LocationModel.findById(locationObjectId1),
      LocationModel.findById(locationObjectId2),
    ]);

    if (!location1 || !location2) {
      throw new AppError('One or both locations not found', 404);
    }

    const conflicts: string[] = [];
    if (location1.locationName !== location2.locationName) {
      conflicts.push('Different location names');
    }
    if (location1.address !== location2.address) {
      conflicts.push('Different addresses');
    }

    // Determine which location to keep (prefer the one with more usage)
    const target = location1.usageCount >= location2.usageCount ? location1 : location2;
    const source = location1.usageCount >= location2.usageCount ? location2 : location1;

    return {
      source: source.toObject() as unknown as Record<string, unknown>,
      target: target.toObject() as unknown as Record<string, unknown>,
      conflicts,
      recommendation: `Merge into ${target.locationName} (higher usage: ${target.usageCount} vs ${source.usageCount})`,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to suggest merge';
    throw new AppError(`Error suggesting location merge: ${errorMessage}`, 500);
  }
};

/**
 * Merge two locations
 */
export const mergeLocations = async (
  sourceId: string,
  targetId: string
, verifiedConnection?: mongoose.Connection): Promise<void> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const ProjectModel = getProjectModel(verifiedConnection);
  try {
    const validationService = new ValidationService();
    const sourceObjectId = validationService.validateObjectId(sourceId, 'sourceId');
    const targetObjectId = validationService.validateObjectId(targetId, 'targetId');

    const [source, target] = await Promise.all([
      LocationModel.findById(sourceObjectId),
      LocationModel.findById(targetObjectId),
    ]);

    if (!source || !target) {
      throw new AppError('One or both locations not found', 404);
    }

    if (source.isDeleted || target.isDeleted) {
      throw new AppError('Cannot merge deleted locations', 400);
    }

    // Update all collections to use target location
    await ProjectModel.updateMany(
      { locationId: sourceObjectId },
      { locationId: targetObjectId }
    );

    // Update target location with combined usage count
    target.usageCount = (target.usageCount || 0) + (source.usageCount || 0);
    if (!target.lastUsedAt || (source.lastUsedAt && source.lastUsedAt > target.lastUsedAt)) {
      target.lastUsedAt = source.lastUsedAt;
    }

    await target.save();

    // Soft delete source location
    source.isDeleted = true;
    await source.save();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to merge locations';
    throw new AppError(`Error merging locations: ${errorMessage}`, 500);
  }
};

