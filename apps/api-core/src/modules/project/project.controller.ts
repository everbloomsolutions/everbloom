import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';
import { Response } from 'express';

// Customer endpoints
@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(@Inject(ProjectService) private readonly projectService: ProjectService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: UserDocument,
    @Req() req: any,
  ) {
    const project = await this.projectService.createProject(
      createProjectDto,
      user._id.toString(),
      user.role,
      req,
    );

    const message =
      createProjectDto.serviceType === 'recycling'
      ? 'Collection recorded successfully'
      : 'Service request submitted successfully';
    
    return {
      success: true,
      data: project,
      message,
    };
  }

  @Get()
  async getUserProjects(
    @CurrentUser() user: UserDocument,
    @Query() query: any,
  ) {
    const projects = await this.projectService.getUserProjects(
      user._id.toString(),
      query,
    );
    return {
      success: true,
      data: { projects },
    };
  }

  @Get(':id')
  async getProjectById(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const project = await this.projectService.getProjectById(id, user._id.toString());

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      success: true,
      data: project,
    };
  }

  @Post(':id/accept-quote')
  @HttpCode(HttpStatus.OK)
  async acceptQuote(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: UserDocument,
  ) {
    const existing = await this.projectService.getProjectById(id, user._id.toString());
    if (!existing || (existing as any).status !== 'quoted') {
      throw new BadRequestException('Project must be quoted before accepting');
    }
    const project = await this.projectService.updateCollection(
      id,
      user._id.toString(),
      user.role,
      { status: 'accepted' },
    );
    return {
      success: true,
      data: project,
      message: 'Quote accepted successfully',
    };
  }

  @Post(':id/reject-quote')
  @HttpCode(HttpStatus.OK)
  async rejectQuote(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: UserDocument,
  ) {
    const project = await this.projectService.updateCollection(
      id,
      user._id.toString(),
      user.role,
      { status: 'rejected' },
    );
    return {
      success: true,
      data: project,
      message: 'Quote rejected successfully',
    };
  }
}

// Admin endpoints
@Controller('admin/collections')
@UseGuards(AuthGuard, RolesGuard)
export class ProjectAdminController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @Roles('admin', 'super_admin')
  async getAllProjects(@Query() query: any, @CurrentUser() user: UserDocument, @Req() _req: any) {
    return this.projectService.getAllProjects({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
  }

  @Get('statistics')
  @Roles('admin', 'super_admin', 'agent', 'user')
  async getCollectionStatistics(@Query() query: any, @CurrentUser() user: UserDocument) {
    return this.projectService.getCollectionStatistics({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
  }

  @Get('stats')
  @Roles('admin', 'super_admin', 'agent')
  async getProjectStats(@Query() query: any, @CurrentUser() user: UserDocument) {
    return this.projectService.getProjectStats({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
  }

  @Get('analytics')
  @Roles('admin', 'super_admin', 'agent')
  async getCollectionAnalytics(@Query() query: any, @CurrentUser() user: UserDocument) {
    return this.projectService.getCollectionAnalytics({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
  }

  @Get('financial-analytics')
  @Roles('admin', 'super_admin', 'agent')
  async getFinancialAnalytics(@Query() query: any, @CurrentUser() user: UserDocument) {
    return this.projectService.getFinancialAnalytics({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
  }

  @Get('time-series-analytics')
  @Roles('admin', 'super_admin')
  async getTimeSeriesAnalytics(@Query() query: any, @CurrentUser() user: UserDocument) {
    return this.projectService.getTimeSeriesAnalytics({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
  }

  @Get('agent-performance')
  @Roles('admin', 'super_admin', 'agent')
  async getAgentPerformanceAnalytics(@Query() query: any, @CurrentUser() user: UserDocument) {
    return this.projectService.getAgentPerformanceAnalytics({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
  }

  @Post('archive-duplicates')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async archiveDuplicateCollections(@Body() body: any) {
    const mode = body?.mode === 'apply' ? 'apply' : 'dry-run';
    const limitGroups = typeof body?.limitGroups === 'number' ? body.limitGroups : undefined;
    const report = await this.projectService.archiveDuplicateCollections({ mode, limitGroups });
    return {
      success: true,
      data: report,
    };
  }

  @Get('my-analytics')
  @Roles('admin', 'super_admin', 'agent', 'user')
  async getMyCollectionAnalytics(@Query() query: any, @CurrentUser() user: UserDocument) {
    return this.projectService.getMyCollectionAnalytics(user._id.toString(), {
      ...query,
    });
  }

  @Get('archived')
  @Roles('admin', 'super_admin')
  async getArchivedCollections(@Query() query: any, @CurrentUser() user: UserDocument) {
    // Return archived (deleted) collections
    return this.projectService.getAllProjects({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
      includeDeleted: true, // Flag to include deleted projects
    });
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'agent', 'user')
  async getProjectByIdAdmin(@Param('id') id: string, @CurrentUser() user: UserDocument, @Req() _req: any) {
    const project = await this.projectService.getProjectByIdAdmin(
      id,
      user._id.toString(),
      user.role,
    );
    return {
      success: true,
      data: project,
    };
  }

  @Post()
  @Roles('admin', 'super_admin', 'agent')
  @HttpCode(HttpStatus.CREATED)
  async createCollection(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: UserDocument,
    @Req() req: any,
  ) {
    const project = await this.projectService.createCollection(
      createProjectDto,
      user._id.toString(),
      user.role,
      req,
    );
    return {
      success: true,
      data: project,
      message: 'Collection created successfully',
    };
  }

  @Put(':id')
  @Roles('admin', 'super_admin', 'agent')
  async updateCollection(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() req: any,
  ) {
    const project = await this.projectService.updateCollection(
      id,
      user._id.toString(),
      user.role,
      updateProjectDto,
      req,
    );
    return {
      success: true,
      data: project,
      message: 'Collection updated successfully',
    };
  }

  @Delete(':id')
  @Roles('admin', 'super_admin', 'agent')
  @HttpCode(HttpStatus.OK)
  async deleteCollection(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Req() req: any,
  ) {
    await this.projectService.deleteCollection(id, user._id.toString(), user.role, req);
    return {
      success: true,
      message: 'Collection deleted successfully',
    };
  }

  @Put(':id/transfer')
  @Roles('admin', 'super_admin')
  async transferCollection(
    @Param('id') id: string,
    @Body('newUserId') newUserId: string,
    @Body('newAgentId') newAgentId: string,
    @CurrentUser() user: UserDocument,
    @Req() req: any,
  ) {
    const transferTo = newUserId || newAgentId;
    if (!transferTo) {
      throw new BadRequestException('newUserId or newAgentId is required');
    }
    const project = await this.projectService.transferCollection(id, transferTo, user._id.toString(), req);
    return {
      success: true,
      data: project,
      message: 'Collection transferred successfully',
    };
  }

  @Get('export')
  @Roles('admin', 'super_admin', 'agent')
  async exportCollections(
    @Query() query: any,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const importService = await import('./project.import.service');
    const fileFormat = (query?.format === 'xlsx' ? 'xlsx' : 'csv') as 'csv' | 'xlsx';
    const result = await importService.exportCollections(
      {
        locationType: query?.locationType,
        startDate: query?.startDate ? new Date(query.startDate) : undefined,
        endDate: query?.endDate ? new Date(query.endDate) : undefined,
      },
      fileFormat,
    );

    const filename = `collections-export-${user.role}-${Date.now()}.${result.extension}`;
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result.data);
  }

  @Post('import/validate')
  @Roles('admin', 'super_admin', 'agent')
  @UseInterceptors(FileInterceptor('file'))
  async validateCollectionsImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
    @CurrentUser() user: UserDocument,
    @Req() _req: any,
  ) {
    const csvData = typeof body?.csvData === 'string' ? body.csvData : undefined;
    const fileBuffer = file?.buffer;
    if (!fileBuffer && !csvData) {
      throw new BadRequestException('File upload (file) or csvData is required');
    }
    return this.projectService.validateCollectionsImport(
      fileBuffer || csvData,
      user._id.toString(),
      user.role,
      file?.originalname,
    );
  }

  @Post('import')
  @Roles('admin', 'super_admin', 'agent')
  @UseInterceptors(FileInterceptor('file'))
  async importCollections(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
    @CurrentUser() user: UserDocument,
    @Req() req: any,
  ) {
    const csvData = typeof body?.csvData === 'string' ? body.csvData : undefined;
    const fileBuffer = file?.buffer;
    if (!fileBuffer && !csvData) {
      throw new BadRequestException('File upload (file) or csvData is required');
    }
    return this.projectService.importCollections(
      fileBuffer || csvData,
      user._id.toString(),
      user.role,
      req,
      file?.originalname,
    );
  }

  @Get('import/template')
  @Roles('admin', 'super_admin', 'agent')
  async getCollectionsImportTemplate(@Res() res: Response) {
    const csv = await this.projectService.getCollectionsImportTemplate();
    const filename = 'collections-import-template.csv';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}

