/**
 * Receipt PDF Generation Service
 * Generates professional PDF receipts for collections
 */

import PDFDocument from 'pdfkit';
import { IReceipt } from './receipt.model';
import { brandConfig } from '../../config/brand';
import { getLocationTypeLabel, getMaterialTypeLabel } from '../../types/collections';
import { PdfService, TableColumn } from '../../infrastructure/export/pdf.service';

/**
 * Format currency amount with ₹ symbol
 */
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time for display
 */
const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// getMaterialTypeLabel is now imported from types/collections

/**
 * Generate PDF buffer from receipt data
 */
export const generateReceiptPDF = async (receipt: IReceipt): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const pdfService = new PdfService();
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header Section - Compact and minimal
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text(brandConfig.name, { align: 'center' })
        .moveDown(0.2);

      if (brandConfig.tagline) {
        doc
          .fontSize(9)
          .font('Helvetica-Oblique')
          .fillColor('#666666')
          .text(brandConfig.tagline, { align: 'center' })
          .moveDown(0.2);
      }

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text(brandConfig.contact.email, { align: 'center' });
      
      if (brandConfig.contact.website) {
        doc.text(brandConfig.contact.website, { align: 'center' });
      }
      
      doc.fillColor('#000000').moveDown(0.6);

      // Divider line - consistent styling
      pdfService.addSectionDivider(doc, 0, 1);

      // Receipt Number and Date Section - Compact
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('RECEIPT', { align: 'center' })
        .moveDown(0.5);

      // Receipt info in compact box
      const receiptInfoY = doc.y;
      const receiptBoxWidth = 300;
      const receiptBoxX = (595 - receiptBoxWidth) / 2; // Center the box
      const receiptBoxHeight = 40;
      
      doc
        .rect(receiptBoxX, receiptInfoY - 5, receiptBoxWidth, receiptBoxHeight)
        .fillColor('#f8f9fa')
        .fill()
        .fillColor('#000000')
        .strokeColor('#c8d0d8')
        .lineWidth(1)
        .stroke()
        .fillColor('#000000');

      // Receipt Number - Compact
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Receipt Number', receiptBoxX + 12, receiptInfoY, { width: 120 });
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(receipt.receiptNumber, receiptBoxX + 12, receiptInfoY + 10, { width: 276 });
      
      // Date - Compact
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Date', receiptBoxX + 12, receiptInfoY + 20, { width: 120 });
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#000000')
        .text(formatDate(receipt.collectionDate), receiptBoxX + 12, receiptInfoY + 28, { width: 276 });

      doc.y = receiptInfoY + receiptBoxHeight;
      doc.moveDown(0.5);

      // Divider line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#cccccc')
        .lineWidth(1)
        .stroke()
        .moveDown(1);

      // Location Details Section - Compact
      pdfService.ensureSectionStart(doc, 40);
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Location Details:', { continued: false })
        .moveDown(0.3);

      // Location details box - Compact
      const locationBoxY = doc.y;
      const locationBoxHeight = (receipt.locationType ? 12 : 0) + 
                                (receipt.locationName ? 12 : 0) + 
                                (receipt.address ? 15 : 0) + 8;
      
      doc
        .rect(50, locationBoxY - 5, 495, locationBoxHeight)
        .fillColor('#fafafa')
        .fill()
        .fillColor('#000000')
        .strokeColor('#e0e0e0')
        .lineWidth(1)
        .stroke()
        .fillColor('#000000');

      let locationY = locationBoxY;
      if (receipt.locationType) {
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Type:', 60, locationY, { width: 50 })
          .font('Helvetica')
          .fontSize(8)
          .text(getLocationTypeLabel(receipt.locationType), 115, locationY, { width: 430 });
        locationY += 12;
      }

      if (receipt.locationName) {
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Name:', 60, locationY, { width: 50 })
          .font('Helvetica')
          .fontSize(8)
          .text(receipt.locationName, 115, locationY, { width: 430 });
        locationY += 12;
      }

      if (receipt.address) {
        const addressParts: string[] = [];
        if (receipt.address.address) addressParts.push(receipt.address.address);
        if (receipt.address.city) addressParts.push(receipt.address.city);
        if (receipt.address.state) addressParts.push(receipt.address.state);
        if (receipt.address.zipCode) addressParts.push(receipt.address.zipCode);

        if (addressParts.length > 0) {
          doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .text('Address:', 60, locationY, { width: 50 })
            .font('Helvetica')
            .fontSize(8)
            .text(addressParts.join(', '), 115, locationY, { width: 430 });
        }
      }

      doc.y = locationBoxY + locationBoxHeight;
      doc.moveDown(0.5);

      // Divider line - consistent styling
      pdfService.addPageBreakIfNeeded(doc, 80); // Ensure space for table
      pdfService.addSectionDivider(doc, 0, 0.5);

      // Collection Items Table - Using reusable table utility
      pdfService.ensureSectionStart(doc, 40);
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Collection Items:', { continued: false })
        .moveDown(0.3);

      const itemColumns: TableColumn[] = [
        { header: 'Material', width: 200, align: 'left' },
        { header: 'Weight (kg)', width: 85, align: 'right', formatter: pdfService.formatNumber(2) },
        { header: 'Rate', width: 105, align: 'right', formatter: pdfService.formatCurrency },
        { header: 'Amount', width: 105, align: 'right', formatter: pdfService.formatCurrency },
      ];

      const itemTableData = receipt.collectionItems.map(item => [
        getMaterialTypeLabel(item.materialType),
        item.weight,
        item.rate,
        item.amount,
      ]);

      pdfService.createTable(doc, itemColumns, itemTableData, {
        startX: 50,
        rowHeight: 20,
        showAlternateRows: true,
        fontSize: 9,
        headerFontSize: 9,
        padding: 4,
      });

      doc.moveDown(0.5);

      // Divider line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#cccccc')
        .lineWidth(1)
        .stroke()
        .moveDown(1);

      // Totals Section - Compact styling
      const totalsLabelWidth = 110;
      const totalsValueWidth = 130;
      const totalsBoxWidth = totalsLabelWidth + totalsValueWidth;
      const totalsBoxX = 50 + 200 + 85 + 105 + 105 - totalsBoxWidth; // Right align from table end

      // Totals box background - Compact
      const totalsY = doc.y;
      const totalsBoxHeight = 60;
      doc
        .rect(totalsBoxX, totalsY - 8, totalsBoxWidth, totalsBoxHeight)
        .fillColor('#f8f9fa')
        .fill()
        .fillColor('#000000')
        .strokeColor('#c8d0d8')
        .lineWidth(1.5)
        .stroke();

      // Subtotal - Compact
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Subtotal:', totalsBoxX + 8, totalsY, { width: totalsLabelWidth - 12 })
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(formatCurrency(receipt.subTotal), totalsBoxX + totalsLabelWidth, totalsY, { width: totalsValueWidth - 8, align: 'right' });

      // GST - Compact
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`GST (${receipt.gstRate}%):`, totalsBoxX + 8, totalsY + 14, { width: totalsLabelWidth - 12 })
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(formatCurrency(receipt.gstAmount), totalsBoxX + totalsLabelWidth, totalsY + 14, { width: totalsValueWidth - 8, align: 'right' });

      // Divider line before total
      doc
        .moveTo(totalsBoxX + 5, totalsY + 30)
        .lineTo(totalsBoxX + totalsBoxWidth - 5, totalsY + 30)
        .strokeColor('#000000')
        .lineWidth(1)
        .stroke();

      // Total - emphasized but compact
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Total:', totalsBoxX + 8, totalsY + 36, { width: totalsLabelWidth - 12 })
        .text(formatCurrency(receipt.totalAmount), totalsBoxX + totalsLabelWidth, totalsY + 36, { width: totalsValueWidth - 8, align: 'right' })
        .moveDown(1.5);

      // Footer Section - Compact
      pdfService.addPageBreakIfNeeded(doc, 60);
      doc.moveDown(1);
      
      // Divider before footer - consistent styling
      pdfService.addSectionDivider(doc, 0, 0.5);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('Thank you for your business!', { align: 'center' })
        .moveDown(0.4);

      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Generated on: ${formatDateTime(receipt.generatedAt || receipt.createdAt || new Date())}`, { align: 'center' })
        .moveDown(0.3)
        .text(`${brandConfig.legal?.copyright || `© ${new Date().getFullYear()} ${brandConfig.name}. All rights reserved.`}`, { align: 'center' })
        .moveDown(0.3);
      
      if (brandConfig.contact.support) {
        doc.text(`For inquiries: ${brandConfig.contact.support}`, { align: 'center' });
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

