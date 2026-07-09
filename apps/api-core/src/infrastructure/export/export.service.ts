import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import { AppError } from '../../common/exceptions/app-error';

export type FileFormat = 'csv' | 'xlsx' | 'json';

export interface ParseOptions {
  skipEmptyLines?: boolean;
  trim?: boolean;
  relaxColumnCount?: boolean;
  columns?: boolean | string[];
}

interface CsvParseOptions {
  skip_empty_lines?: boolean;
  trim?: boolean;
  relax_column_count?: boolean;
  relax_quotes?: boolean;
  escape?: string;
  bom?: boolean;
  columns?: boolean | string[];
}

@Injectable()
export class ExportService {
  /**
   * Parse CSV data with robust error handling
   */
  parseCSV(
    csvData: string | Buffer,
    options: ParseOptions = {}
  ): Record<string, string>[] {
    try {
      const csvString = Buffer.isBuffer(csvData) ? csvData.toString('utf-8') : csvData;
      
      const parseOptions: CsvParseOptions = {
        skip_empty_lines: options.skipEmptyLines !== false,
        trim: options.trim !== false,
        relax_column_count: options.relaxColumnCount !== false,
        relax_quotes: true,
        escape: '"',
        bom: true,
      };

      if (options.columns !== false) {
        parseOptions.columns = options.columns || true;
      } else {
        parseOptions.columns = false;
      }

      const records = parse(csvString, parseOptions);

      if (parseOptions.columns === false) {
        throw new AppError('CSV parsing without column headers is not supported', 400);
      }

      return records as unknown as Record<string, string>[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown CSV parsing error';
      throw new AppError(`CSV parsing failed: ${errorMessage}`, 400);
    }
  }

  /**
   * Generate CSV string from data
   */
  stringifyCSV(data: Record<string, unknown>[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    try {
      return stringify(data, {
        header: true,
        quoted: true,
        escape: '"',
        bom: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown CSV generation error';
      throw new AppError(`CSV generation failed: ${errorMessage}`, 500);
    }
  }

  /**
   * Parse Excel file (XLSX)
   */
  parseExcel(
    fileBuffer: Buffer,
    sheetIndex: number = 0
  ): Record<string, string>[] {
    try {
      const workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      if (workbook.SheetNames.length === 0) {
        throw new AppError('Excel file has no sheets', 400);
      }

      const sheetName = workbook.SheetNames[sheetIndex] || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new AppError(`Sheet "${sheetName}" not found`, 400);
      }

      const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: '',
      });

      return data as Record<string, string>[];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown Excel parsing error';
      throw new AppError(`Excel parsing failed: ${errorMessage}`, 400);
    }
  }

  /**
   * Generate Excel file (XLSX) from data
   */
  generateExcel(
    data: Record<string, unknown>[],
    sheetName: string = 'Sheet1',
    additionalSheets?: Array<{ name: string; data: Record<string, unknown>[] }>
  ): Buffer {
    try {
      const workbook = XLSX.utils.book_new();

      if (data && data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }

      if (additionalSheets) {
        additionalSheets.forEach(({ name, data: sheetData }) => {
          if (sheetData && sheetData.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, name);
          }
        });
      }

      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true,
      });

      return buffer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Excel generation error';
      throw new AppError(`Excel generation failed: ${errorMessage}`, 500);
    }
  }

  /**
   * Detect file format from buffer or filename
   */
  detectFileFormat(buffer: Buffer, filename?: string): FileFormat {
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'xlsx' || ext === 'xls') {
        return 'xlsx';
      }
      if (ext === 'csv') {
        return 'csv';
      }
      if (ext === 'json') {
        return 'json';
      }
    }

    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return 'xlsx';
    }

    try {
      const text = buffer.toString('utf-8');
      if (text.includes(',') || text.includes('\t')) {
        return 'csv';
      }
    } catch {
      // Not valid UTF-8, likely binary
    }

    return 'csv';
  }

  /**
   * Parse file based on detected format
   */
  parseFile(
    buffer: Buffer,
    filename?: string,
    options?: ParseOptions
  ): Record<string, string>[] {
    const format = this.detectFileFormat(buffer, filename);

    switch (format) {
      case 'xlsx':
        return this.parseExcel(buffer);
      case 'csv':
        return this.parseCSV(buffer, options);
      case 'json':
        try {
          const json = JSON.parse(buffer.toString('utf-8'));
          return Array.isArray(json) ? json : [json];
        } catch (_error) {
          throw new AppError('Invalid JSON format', 400);
        }
      default:
        throw new AppError('Unsupported file format', 400);
    }
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format: FileFormat): string {
    switch (format) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Get file extension for format
   */
  getFileExtension(format: FileFormat): string {
    switch (format) {
      case 'xlsx':
        return '.xlsx';
      case 'csv':
        return '.csv';
      case 'json':
        return '.json';
      default:
        return '';
    }
  }
}
