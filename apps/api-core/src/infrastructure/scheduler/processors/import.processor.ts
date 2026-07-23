import { Inject } from '@nestjs/common';
import { Processor, Process, OnQueueCompleted, OnQueueFailed, OnQueueProgress } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../../logger/logger.service';
import * as importProjectService from '../../../modules/project/project.import.service';
import * as importLocationService from '../../../modules/location/location.import.service';

export type ImportType = 'collections' | 'locations';

export interface ImportJobData {
  type: ImportType;
  fileData: string | Buffer;
  filename?: string;
  userId: string;
}

export interface ImportJobResult {
  success: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    id?: string;
    error?: string;
  }>;
  errorReport?: string;
}

/**
 * Process collections import with progress updates
 */
async function processCollectionsImport(
  job: Job<ImportJobData>,
  fileData: string | Buffer,
  filename: string | undefined,
  userId: string
): Promise<ImportJobResult> {
  // Update progress: 10% - file parsed
  await job.progress(10);

  // Process import
  const result = await importProjectService.importCollections(fileData, userId, filename);

  // Update progress: 100% - complete
  await job.progress(100);

  return {
    success: result.success,
    failed: result.failed,
    results: result.results.map(r => ({
      row: r.row,
      success: r.success,
      id: r.collectionId,
      error: r.error,
    })),
    errorReport: result.errorReport,
  };
}

/**
 * Process locations import with progress updates
 */
async function processLocationsImport(
  job: Job<ImportJobData>,
  fileData: string | Buffer,
  filename: string | undefined,
  userId: string
): Promise<ImportJobResult> {
  // Update progress: 10% - file parsed
  await job.progress(10);

  // Process import
  const result = await importLocationService.importLocations(fileData, userId, filename);

  // Update progress: 100% - complete
  await job.progress(100);

  return {
    success: result.success,
    failed: result.failed,
    results: result.results.map(r => ({
      row: r.row,
      success: r.success,
      id: r.locationId,
      error: r.error,
    })),
    errorReport: result.errorReport,
  };
}

@Processor('import')
export class ImportProcessor {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {
    this.logger.setContext('ImportProcessor');
  }

  @Process()
  async handleImport(job: Job<ImportJobData>): Promise<ImportJobResult> {
    const { type, fileData, filename, userId } = job.data;

    this.logger.log(`Processing ${type} import job ${job.id} for user ${userId}`);

    try {
      let result: ImportJobResult;

      if (type === 'collections') {
        result = await processCollectionsImport(job, fileData, filename, userId);
      } else {
        result = await processLocationsImport(job, fileData, filename, userId);
      }

      this.logger.log(`Import job ${job.id} completed: ${result.success} succeeded, ${result.failed} failed`);
      return result;
    } catch (error) {
      this.logger.error(`Import job ${job.id} failed:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  @OnQueueProgress()
  onProgress(job: Job<ImportJobData>, progress: number) {
    this.logger.debug(`Import job ${job.id} progress: ${progress}%`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<ImportJobData>, result: ImportJobResult) {
    this.logger.log(`Import job ${job.id} completed: ${result.success} succeeded, ${result.failed} failed`);
  }

  @OnQueueFailed()
  onFailed(job: Job<ImportJobData> | undefined, err: Error) {
    this.logger.error(`Import job ${job?.id} failed:`, err.message);
  }
}
