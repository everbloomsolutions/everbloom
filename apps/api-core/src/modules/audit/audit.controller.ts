import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { AuditLogQueryDto, AuditLogStatsQueryDto } from './dto/audit-log-query.dto';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { EntityType } from './schemas/audit-log.schema';
import * as auditExportService from './audit.export.service';

@Controller('admin/audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    const result = await this.auditService.getAuditLogs(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('stats')
  async getAuditLogStats(
    @Query() query: AuditLogStatsQueryDto,
  ) {
    const filters = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      entityType: query.entityType,
    };

    if (query.enhanced === 'true') {
      const result = await this.auditService.getEnhancedAuditLogStats({
        ...filters,
        groupBy: query.groupBy,
      });
      return {
        success: true,
        data: result,
      };
    }

    const result = await this.auditService.getAuditLogStats(filters);
    return {
      success: true,
      data: result,
    };
  }

  @Get('entity/:entityType/:entityId')
  async getEntityAuditLogs(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      action: action as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const result = await this.auditService.getEntityAuditLogs(
      entityType,
      entityId,
      filters,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('export/csv')
  @HttpCode(HttpStatus.OK)
  async exportAuditLogsCSV(
    @Query() query: AuditLogQueryDto,
    @Res() res: Response,
  ) {
    await this.databaseService.ensureConnectionReady();
    const verifiedConnection = this.databaseService.getConnection();
    const csv = await auditExportService.exportAuditLogsToCSV({
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action as any,
      performedBy: query.performedBy,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      search: query.search,
    }, verifiedConnection);

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('export/json')
  @HttpCode(HttpStatus.OK)
  async exportAuditLogsJSON(
    @Query() query: AuditLogQueryDto,
    @Res() res: Response,
  ) {
    await this.databaseService.ensureConnectionReady();
    const verifiedConnection = this.databaseService.getConnection();
    const json = await auditExportService.exportAuditLogsToJSON({
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action as any,
      performedBy: query.performedBy,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      search: query.search,
    }, verifiedConnection);

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(json);
  }
}
