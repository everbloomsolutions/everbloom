import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  BadRequestException,
  Logger,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { SearchLocationDto } from './dto/search-location.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';
import { DatabaseService } from '../../infrastructure/database/database.service';

import { checkForDuplicates, archiveDuplicateLocations, suggestMerge, mergeLocations } from './location.duplicate.service';
import * as locationImportService from './location.import.service';
import * as locationBulkService from './location.bulk.service';

@Controller('admin/locations')
@UseGuards(AuthGuard, RolesGuard)
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('check-duplicates')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async checkDuplicates(@Body() body: any) {
    try {
      await this.databaseService.ensureConnectionReady();
      const threshold = typeof body?.threshold === 'number' ? body.threshold : undefined;
      const duplicates = await checkForDuplicates(body, threshold);
      return {
        success: true,
        data: {
          duplicates,
        },
      };
    } catch (error) {
      // Duplicate checking should never block location creation.
      // If DB is temporarily unhealthy, return "no duplicates" and let create flow proceed.
      this.logger.error('Duplicate check failed; returning empty duplicate list', error);
      return {
        success: true,
        data: {
          duplicates: [],
        },
      };
    }
  }

  @Post('archive-duplicates')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async archiveDuplicates(@Body() body: any) {
    const mode = body?.mode === 'apply' ? 'apply' : 'dry-run';
    const limitGroups = typeof body?.limitGroups === 'number' ? body.limitGroups : undefined;
    const report = await archiveDuplicateLocations({ mode, limitGroups });
    return {
      success: true,
      data: report,
    };
  }

  @Get(':id1/merge/:id2')
  @Roles('admin', 'super_admin')
  async suggestMerge(@Param('id1') id1: string, @Param('id2') id2: string) {
    const result = await suggestMerge(id1, id2);
    return {
      success: true,
      data: result,
    };
  }

  @Post('merge')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async mergeLocations(@Body('sourceId') sourceId: string, @Body('targetId') targetId: string) {
    await mergeLocations(sourceId, targetId);
    return {
      success: true,
      message: 'Locations merged successfully',
    };
  }

  @Post('bulk')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreateLocations(
    @Body('locations') locations: any[],
    @CurrentUser() user: UserDocument,
  ) {
    const result = await locationBulkService.bulkCreateLocations(locations, user._id.toString());
    return {
      success: true,
      data: result,
      message: `Bulk create completed: ${result.success} succeeded, ${result.failed} failed`,
    };
  }

  @Put('bulk')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateLocations(@Body('updates') updates: any[]) {
    const result = await locationBulkService.bulkUpdateLocations(updates);
    return {
      success: true,
      data: result,
      message: `Bulk update completed: ${result.success} succeeded, ${result.failed} failed`,
    };
  }

  @Post('bulk/delete')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async bulkDeleteLocations(@Body('ids') ids: string[]) {
    const result = await locationBulkService.bulkDeleteLocations(ids);
    return {
      success: true,
      data: result,
      message: `Bulk delete completed: ${result.success} succeeded, ${result.failed} failed`,
    };
  }

  @Post('import/validate')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async validateLocationsImport(
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: any,
  ) {
    const csvData = typeof body?.csvData === 'string' ? body.csvData : undefined;
    const fileBuffer = file?.buffer;

    if (!fileBuffer && !csvData) {
      throw new BadRequestException('File upload (file) or csvData is required');
    }

    const result = await locationImportService.validateLocationsImport(
      fileBuffer || csvData,
      file?.originalname,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('import')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async importLocations(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
    @CurrentUser() user: UserDocument,
  ) {
    const csvData = typeof body?.csvData === 'string' ? body.csvData : undefined;
    const fileBuffer = file?.buffer;

    if (!fileBuffer && !csvData) {
      throw new BadRequestException('File upload (file) or csvData is required');
    }

    const result = await locationImportService.importLocations(
      fileBuffer || csvData,
      user._id.toString(),
      file?.originalname,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('import/template')
  @Roles('admin', 'super_admin')
  async getImportTemplate(@Res() res: Response) {
    const csv = locationImportService.getImportTemplate();
    const filename = 'locations-import-template.csv';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async createLocation(
    @Body() createLocationDto: CreateLocationDto,
    @CurrentUser() user: UserDocument,
    @Query('checkFuzzyDuplicates') _checkFuzzyDuplicates?: string,
  ) {
    const location = await this.locationService.createLocation(
      createLocationDto,
      user._id.toString(),
    );

    // TODO: Add fuzzy duplicate checking if requested
    // For now, just return the created location
    return {
      success: true,
      data: location,
      message: 'Location created successfully',
    };
  }

  @Get()
  @Roles('admin', 'super_admin', 'agent')
  async getLocations(@Query() query: LocationQueryDto, @CurrentUser() user: UserDocument) {
    // Role-based filtering: Agents only see their assigned locations
    if (user.role === 'agent' && user._id) {
      if (!query.assignedToAgent) {
        query.assignedToAgent = user._id.toString();
      }
    }

    const result = await this.locationService.getLocations(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('search')
  @Roles('admin', 'super_admin', 'agent')
  async searchLocations(
    @Query() searchDto: SearchLocationDto,
    @CurrentUser() user: UserDocument,
  ) {
    const query = searchDto.q || '';
    const limit = searchDto.limit || 10;
    const userId = user._id.toString();
    const userRole = user.role;

    // Role-based filtering handled in service
    const locations = await this.locationService.searchLocations(
      query,
      limit,
      userRole === 'agent' ? userId : undefined,
    );

    return {
      success: true,
      data: locations,
    };
  }

  @Get('stats')
  @Roles('admin', 'super_admin')
  async getLocationStats() {
    const stats = await this.locationService.getLocationStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('analytics')
  @Roles('admin', 'super_admin', 'agent')
  async getLocationAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('locationType') locationType?: string,
    @CurrentUser() user?: UserDocument,
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      locationType,
      userId: user?._id?.toString(),
      userRole: user?.role,
    };

    const analytics = await this.locationService.getLocationAnalytics(filters);
    return {
      success: true,
      data: analytics,
    };
  }

  @Get('export')
  @Roles('admin', 'super_admin')
  async exportLocations(
    @Query('format') format?: string,
    @Query('locationType') locationType?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('isActive') isActive?: string,
  ) {
    const { exportLocations } = await import('./location.import.service');
    const fileFormat = (format === 'xlsx' ? 'xlsx' : 'csv') as 'csv' | 'xlsx';
    const filters = {
      locationType,
      city,
      state,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };
    const result = await exportLocations(filters, fileFormat);
    
    // Return appropriate response based on format
    if (fileFormat === 'xlsx') {
      return {
        success: true,
        data: result.data.toString('base64'),
        mimeType: result.mimeType,
        extension: result.extension,
      };
    }
    
    return {
      success: true,
      data: result.data,
      mimeType: result.mimeType,
      extension: result.extension,
    };
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'agent')
  async getLocationById(@Param('id') id: string) {
    const location = await this.locationService.getLocationById(id);
    return {
      success: true,
      data: location,
    };
  }

  @Get(':id/stats')
  @Roles('admin', 'super_admin', 'agent')
  async getLocationWithStats(@Param('id') id: string) {
    const location = await this.locationService.getLocationWithStats(id);
    return {
      success: true,
      data: location,
    };
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  async updateLocation(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @CurrentUser() user: UserDocument,
  ) {
    const location = await this.locationService.updateLocation(
      id,
      updateLocationDto,
      user._id.toString(),
    );
    return {
      success: true,
      data: location,
      message: 'Location updated successfully',
    };
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async deleteLocation(@Param('id') id: string) {
    await this.locationService.deleteLocation(id);
    return {
      success: true,
      message: 'Location deleted successfully',
    };
  }
}
