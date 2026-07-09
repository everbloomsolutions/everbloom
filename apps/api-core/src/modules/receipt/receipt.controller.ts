import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ReceiptService } from './receipt.service';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';
import { generateReceiptPDF } from './receipt.pdf.service';
import { CloudinaryService } from '../../infrastructure/cloudinary/cloudinary.service';
import { Logger } from '@nestjs/common';

@Controller('receipts')
@UseGuards(AuthGuard)
export class ReceiptController {
  private readonly logger = new Logger(ReceiptController.name);

  constructor(
    private readonly receiptService: ReceiptService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'agent')
  @HttpCode(HttpStatus.CREATED)
  async generateReceipt(
    @Body() generateReceiptDto: GenerateReceiptDto,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const receipt = await this.receiptService.generateReceipt(
      generateReceiptDto,
      user._id.toString(),
      res.req,
    );

    return res.status(201).json({
      success: true,
      data: receipt,
      message: 'Receipt generated successfully',
    });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'agent')
  async getAllReceipts(
    @Query() query: ReceiptQueryDto,
    @CurrentUser() user: UserDocument,
  ) {
    const result = await this.receiptService.getAllReceipts({
      ...query,
      userId: user._id.toString(),
      userRole: user.role as 'admin' | 'agent',
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id/pdf')
  @HttpCode(HttpStatus.OK)
  async downloadReceiptPDF(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const receipt = await this.receiptService.getReceiptById(id);

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Authorization check: Users can only download receipts for collections at their default location
    if (user.role === 'user') {
      const hasAccess = await this.receiptService.checkUserReceiptAccess(
        user._id.toString(),
        receipt,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only download receipts for collections at your default location',
        );
      }
    }

    // Generate PDF buffer
    const pdfBuffer = await generateReceiptPDF(receipt as any);

    // Optionally upload to Cloudinary and save URL (non-blocking)
    if (!receipt.pdfUrl) {
      (async () => {
        try {
          const uploadResult = await this.cloudinaryService.uploadBuffer(pdfBuffer, {
            folder: 'receipts',
            publicId: receipt.receiptNumber,
            resourceType: 'raw',
            overwrite: false,
          });
          // Update receipt with PDF URL
          try {
            await this.receiptService.updateReceiptPdfUrl(id, uploadResult.secureUrl || uploadResult.url);
          } catch (error) {
            this.logger.error('Failed to update receipt PDF URL:', error);
          }
        } catch (error) {
          // Log but don't fail the request if Cloudinary upload fails
          this.logger.warn('Failed to upload receipt PDF to Cloudinary:', error);
        }
      })();
    }

    // Set response headers
    const filename = `receipt-${receipt.receiptNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF buffer
    res.send(pdfBuffer);
  }

  @Get(':id')
  async getReceiptById(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const receipt = await this.receiptService.getReceiptById(id);

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Authorization check: Users can only view receipts for collections at their default location
    if (user.role === 'user') {
      const hasAccess = await this.receiptService.checkUserReceiptAccess(
        user._id.toString(),
        receipt,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only view receipts for collections at your default location',
        );
      }
    }

    return {
      success: true,
      data: receipt,
    };
  }

  @Get('number/:receiptNumber')
  async getReceiptByNumber(
    @Param('receiptNumber') receiptNumber: string,
    @CurrentUser() user: UserDocument,
  ) {
    const receipt = await this.receiptService.getReceiptByNumber(receiptNumber);

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Authorization check: Users can only view receipts for collections at their default location
    if (user.role === 'user') {
      const hasAccess = await this.receiptService.checkUserReceiptAccess(
        user._id.toString(),
        receipt,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only view receipts for collections at your default location',
        );
      }
    }

    return {
      success: true,
      data: receipt,
    };
  }

  @Get('collection/:collectionId/print')
  @HttpCode(HttpStatus.OK)
  async printReceiptPDF(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const receipt = await this.receiptService.getReceiptByCollectionId(collectionId);

    if (!receipt) {
      throw new NotFoundException('Receipt not found for this collection');
    }

    // Authorization check: Users can only print receipts for collections at their default location
    if (user.role === 'user') {
      const hasAccess = await this.receiptService.checkUserReceiptAccess(
        user._id.toString(),
        receipt,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only print receipts for collections at your default location',
        );
      }
    }

    // Generate PDF buffer
    const pdfBuffer = await generateReceiptPDF(receipt as any);

    // Optionally upload to Cloudinary and save URL (non-blocking)
    if (!receipt.pdfUrl) {
      (async () => {
        try {
          const uploadResult = await this.cloudinaryService.uploadBuffer(pdfBuffer, {
            folder: 'receipts',
            publicId: receipt.receiptNumber,
            resourceType: 'raw',
            overwrite: false,
          });
          // Update receipt with PDF URL
          try {
            await this.receiptService.updateReceiptPdfUrl(
              receipt._id.toString(),
              uploadResult.secureUrl || uploadResult.url,
            );
          } catch (error) {
            this.logger.error('Failed to update receipt PDF URL:', error);
          }
        } catch (error) {
          // Log but don't fail the request if Cloudinary upload fails
          this.logger.warn('Failed to upload receipt PDF to Cloudinary:', error);
        }
      })();
    }

    // Set response headers
    const filename = `receipt-${receipt.receiptNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF buffer
    res.send(pdfBuffer);
  }

  @Get('collection/:collectionId')
  async getReceiptByCollectionId(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const receipt = await this.receiptService.getReceiptByCollectionId(collectionId);

    if (!receipt) {
      throw new NotFoundException('Receipt not found for this collection');
    }

    // Authorization check: Users can only view receipts for collections at their default location
    if (user.role === 'user') {
      const hasAccess = await this.receiptService.checkUserReceiptAccess(
        user._id.toString(),
        receipt,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only view receipts for collections at your default location',
        );
      }
    }

    return {
      success: true,
      data: receipt,
    };
  }
}
