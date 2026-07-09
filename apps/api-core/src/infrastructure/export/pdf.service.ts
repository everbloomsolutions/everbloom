import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

// A4 page dimensions
export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;
export const PAGE_MARGIN = 50;
export const PAGE_BOTTOM_MARGIN = 50;
export const MAX_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN - PAGE_BOTTOM_MARGIN;

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: unknown) => string;
}

export interface TableOptions {
  startX?: number;
  startY?: number;
  rowHeight?: number;
  headerHeight?: number;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  alternateRowColor?: string;
  borderColor?: string;
  borderWidth?: number;
  headerBorderWidth?: number;
  fontSize?: number;
  headerFontSize?: number;
  padding?: number;
  showBorders?: boolean;
  showAlternateRows?: boolean;
  maxRowsPerPage?: number;
  minSpaceAtBottom?: number;
  repeatHeaderOnNewPage?: boolean;
}

@Injectable()
export class PdfService {
  // Constants
  readonly PAGE_WIDTH = PAGE_WIDTH;
  readonly PAGE_HEIGHT = PAGE_HEIGHT;
  readonly PAGE_MARGIN = PAGE_MARGIN;
  readonly PAGE_BOTTOM_MARGIN = PAGE_BOTTOM_MARGIN;
  readonly MAX_CONTENT_HEIGHT = MAX_CONTENT_HEIGHT;

  /**
   * Check if there's enough space on current page for content
   */
  hasSpaceForContent(
    doc: InstanceType<typeof PDFDocument>,
    requiredHeight: number,
    minSpaceAtBottom: number = 50
  ): boolean {
    const currentY = doc.y;
    const availableSpace = PAGE_HEIGHT - PAGE_BOTTOM_MARGIN - currentY;
    return availableSpace >= (requiredHeight + minSpaceAtBottom);
  }

  /**
   * Ensure section title doesn't get orphaned - add page break if needed
   */
  ensureSectionStart(
    doc: InstanceType<typeof PDFDocument>,
    sectionTitleHeight: number = 30,
    minSpaceAtBottom: number = 50
  ): void {
    if (!this.hasSpaceForContent(doc, sectionTitleHeight + 20, minSpaceAtBottom)) {
      doc.addPage();
      this.resetFontSettings(doc);
    }
  }

  /**
   * Reset font settings to default for consistency across pages
   */
  private resetFontSettings(doc: InstanceType<typeof PDFDocument>): void {
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#000000');
  }

  /**
   * Add page break if needed, ensuring consistent spacing
   */
  addPageBreakIfNeeded(
    doc: InstanceType<typeof PDFDocument>,
    requiredHeight: number = 50,
    minSpaceAtBottom: number = 50
  ): void {
    if (!this.hasSpaceForContent(doc, requiredHeight, minSpaceAtBottom)) {
      doc.addPage();
      this.resetFontSettings(doc);
    }
  }

  /**
   * Add section divider with consistent styling
   */
  addSectionDivider(
    doc: InstanceType<typeof PDFDocument>,
    spacingBefore: number = 0.5,
    spacingAfter: number = 0.5
  ): void {
    this.addPageBreakIfNeeded(doc, 20);
    doc.moveDown(spacingBefore);
    doc.moveTo(PAGE_MARGIN, doc.y)
      .lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(spacingAfter);
  }

  /**
   * Add section title with consistent styling and page break protection
   */
  addSectionTitle(
    doc: InstanceType<typeof PDFDocument>,
    title: string,
    fontSize: number = 11,
    spacingAfter: number = 0.2,
    align: 'left' | 'center' | 'right' = 'left'
  ): void {
    this.ensureSectionStart(doc, fontSize + 15);
    this.resetFontSettings(doc);
    doc.fontSize(fontSize)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(title, { align })
      .moveDown(spacingAfter);
    this.resetFontSettings(doc);
  }

  /**
   * Create a table in a PDF document with pagination support for large datasets
   */
  createTable(
    doc: InstanceType<typeof PDFDocument>,
    columns: TableColumn[],
    data: unknown[][],
    options: TableOptions = {}
  ): number {
    const {
      startX = 50,
      startY = doc.y,
      rowHeight = 20,
      headerHeight = 20,
      headerBackgroundColor = '#f5f5f5',
      headerTextColor = '#000000',
      alternateRowColor = '#fafafa',
      borderColor = '#000000',
      borderWidth = 0.5,
      headerBorderWidth = 1,
      fontSize = 10,
      headerFontSize = 10,
      padding = 5,
      showBorders = true,
      showAlternateRows = true,
      maxRowsPerPage = 25,
      minSpaceAtBottom = 50,
      repeatHeaderOnNewPage = true,
    } = options;

    if (!data || data.length === 0) {
      return startY;
    }

    const pageWidth = 595;
    const pageHeight = 842;
    const pageMargin = 50;
    const maxTableWidth = pageWidth - (pageMargin * 2);
    
    let totalRequestedWidth = columns.reduce((sum, col) => sum + col.width, 0);
    let adjustedColumns = columns.map(col => ({ ...col }));
    
    if (totalRequestedWidth > maxTableWidth) {
      const scaleFactor = maxTableWidth / totalRequestedWidth;
      adjustedColumns = adjustedColumns.map(col => ({
        ...col,
        width: Math.floor(col.width * scaleFactor),
      }));
      totalRequestedWidth = maxTableWidth;
    }
    
    const actualStartX = Math.max(startX, pageMargin);
    const actualTableWidth = Math.min(totalRequestedWidth, maxTableWidth);
    const pageBottom = pageHeight - pageMargin;

    let currentY = startY;
    let currentPageStartY = startY;
    let rowsOnCurrentPage = 0;

    const columnPositions = adjustedColumns.map((col, index) => {
      let x = actualStartX;
      for (let i = 0; i < index; i++) {
        x += adjustedColumns[i].width;
      }
      return {
        x,
        width: col.width,
        align: col.align || 'left',
      };
    });

    const needsNewPage = (rowsToAdd: number = 1): boolean => {
      const spaceNeeded = headerHeight + (rowsToAdd * rowHeight);
      const availableSpace = pageBottom - currentY;
      return availableSpace < (spaceNeeded + minSpaceAtBottom);
    };

    const drawHeader = (y: number): void => {
      doc
        .rect(actualStartX, y - padding, actualTableWidth, headerHeight)
        .fillColor(headerBackgroundColor)
        .fill()
        .fillColor(headerTextColor);

      doc.fontSize(headerFontSize).font('Helvetica-Bold');
      columnPositions.forEach((pos, index) => {
        const column = adjustedColumns[index];
        const textX = pos.x + padding;
        const textWidth = pos.width - (padding * 2);
        
        doc.text(
          column.header,
          textX,
          y,
          {
            width: textWidth,
            align: pos.align,
          }
        );
      });

      if (showBorders) {
        doc
          .moveTo(actualStartX, y + headerHeight - padding)
          .lineTo(actualStartX + actualTableWidth, y + headerHeight - padding)
          .strokeColor(borderColor)
          .lineWidth(headerBorderWidth)
          .stroke();
      }
    };

    const drawRow = (row: unknown[], rowIndex: number, y: number): void => {
      if (showAlternateRows && rowIndex % 2 === 0) {
        doc
          .rect(actualStartX, y - padding, actualTableWidth, rowHeight)
          .fillColor(alternateRowColor)
          .fill()
          .fillColor('#000000');
      }

      doc.fontSize(fontSize).font('Helvetica');
      row.forEach((cell, cellIndex) => {
        const column = adjustedColumns[cellIndex];
        const pos = columnPositions[cellIndex];
        const textX = pos.x + padding;
        const textWidth = pos.width - (padding * 2);
        
        let cellValue = '';
        if (cell !== null && cell !== undefined) {
          if (column.formatter) {
            cellValue = column.formatter(cell);
          } else {
            cellValue = String(cell);
          }
        }

        doc.text(
          cellValue,
          textX,
          y,
          {
            width: textWidth,
            align: pos.align,
          }
        );
      });

      if (showBorders) {
        const isLastRow = rowIndex === data.length - 1;
        const borderColorValue = isLastRow ? borderColor : '#e0e0e0';
        const borderWidthValue = isLastRow ? headerBorderWidth : borderWidth;
        
        doc
          .moveTo(actualStartX, y + rowHeight - padding)
          .lineTo(actualStartX + actualTableWidth, y + rowHeight - padding)
          .strokeColor(borderColorValue)
          .lineWidth(borderWidthValue)
          .stroke();
      }
    };

    const drawOuterBorders = (startY: number, endY: number): void => {
      if (!showBorders) return;

      doc
        .moveTo(actualStartX, startY - padding)
        .lineTo(actualStartX + actualTableWidth, startY - padding)
        .strokeColor(borderColor)
        .lineWidth(headerBorderWidth)
        .stroke();

      doc
        .moveTo(actualStartX, startY - padding)
        .lineTo(actualStartX, endY - padding)
        .strokeColor(borderColor)
        .lineWidth(headerBorderWidth)
        .stroke();

      doc
        .moveTo(actualStartX + actualTableWidth, startY - padding)
        .lineTo(actualStartX + actualTableWidth, endY - padding)
        .strokeColor(borderColor)
        .lineWidth(headerBorderWidth)
        .stroke();

      doc
        .moveTo(actualStartX, endY - padding)
        .lineTo(actualStartX + actualTableWidth, endY - padding)
        .strokeColor(borderColor)
        .lineWidth(headerBorderWidth)
        .stroke();
    };

    drawHeader(currentY);
    currentY += headerHeight;
    rowsOnCurrentPage = 0;

    data.forEach((row, rowIndex) => {
      if (needsNewPage() || (maxRowsPerPage > 0 && rowsOnCurrentPage >= maxRowsPerPage)) {
        drawOuterBorders(currentPageStartY, currentY);

        doc.addPage();
        currentY = 50;
        currentPageStartY = currentY;
        rowsOnCurrentPage = 0;

        if (repeatHeaderOnNewPage) {
          drawHeader(currentY);
          currentY += headerHeight;
        }
      }

      drawRow(row, rowIndex, currentY);
      currentY += rowHeight;
      rowsOnCurrentPage++;
    });

    drawOuterBorders(currentPageStartY, currentY);
    doc.y = currentY;

    return currentY;
  }

  /**
   * Format currency for table cells
   */
  formatCurrency(value: unknown): string {
    if (typeof value === 'number') {
      return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    return String(value || '');
  }

  /**
   * Format number with decimal places
   */
  formatNumber(decimals: number = 2) {
    return (value: unknown): string => {
      if (typeof value === 'number') {
        return value.toFixed(decimals);
      }
      if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return num.toFixed(decimals);
        }
      }
      return String(value || '');
    };
  }

  /**
   * Format percentage
   */
  formatPercentage(value: unknown): string {
    if (typeof value === 'number') {
      return `${value.toFixed(2)}%`;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(2)}%`;
      }
    }
    return String(value || '');
  }

  /**
   * Format date for table cells
   */
  formatDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    if (typeof value === 'string') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch {
        // Invalid date string
      }
    }
    return String(value || '');
  }

  /**
   * Format date and time for table cells
   */
  formatDateTime(value: unknown): string {
    if (value instanceof Date) {
      return value.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (typeof value === 'string') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        // Invalid date string
      }
    }
    return String(value || '');
  }

  /**
   * Format weight (kg) for table cells
   */
  formatWeight(value: unknown): string {
    if (typeof value === 'number') {
      return `${value.toFixed(2)} kg`;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(2)} kg`;
      }
    }
    return String(value || '');
  }

  /**
   * Truncate text to fit column width
   */
  truncateText(maxLength: number) {
    return (value: unknown): string => {
      const text = String(value || '');
      if (text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength - 3) + '...';
    };
  }

  /**
   * Create a simple two-column key-value table (for metadata/summaries)
   */
  createKeyValueTable(
    doc: InstanceType<typeof PDFDocument>,
    data: Array<{ key: string; value: unknown }>,
    options: {
      startX?: number;
      keyWidth?: number;
      valueWidth?: number;
      rowHeight?: number;
      fontSize?: number;
      keyFontSize?: number;
      padding?: number;
    } = {}
  ): number {
    const {
      startX = 50,
      keyWidth = 200,
      valueWidth = 295,
      rowHeight = 15,
      fontSize = 9,
      keyFontSize = 9,
      padding = 5,
    } = options;

    const tableTop = doc.y;
    let currentY = tableTop;

    data.forEach((item) => {
      doc
        .fontSize(keyFontSize)
        .font('Helvetica-Bold')
        .text(item.key, startX + padding, currentY, {
          width: keyWidth - (padding * 2),
          align: 'left',
        });

      doc
        .fontSize(fontSize)
        .font('Helvetica')
        .text(String(item.value || ''), startX + keyWidth + padding, currentY, {
          width: valueWidth - (padding * 2),
          align: 'left',
        });

      currentY += rowHeight;
    });

    doc.y = currentY;
    return currentY;
  }
}
