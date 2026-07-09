import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';
import * as locationAssignmentService from '../location/location.assignment.service';
import * as locationItemTypeRateService from '../location/location.rate.service';
import { DatabaseService } from '../../infrastructure/database/database.service';

@Controller('admin/assign')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AssignmentController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('users')
  async getUsersWithLocations(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Ensure database connection is ready before operations
    await this.databaseService.ensureConnectionReady();
    const verifiedConnection = this.databaseService.getConnection();
    
    const result = await locationAssignmentService.getUsersWithLocations({
      search: search as string | undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    }, verifiedConnection);
    return {
      success: true,
      data: result,
    };
  }

  @Put('users/:userId/location')
  @HttpCode(HttpStatus.OK)
  async assignUserLocation(
    @Param('userId') userId: string,
    @Body('locationId') locationId: string,
  ) {
    await locationAssignmentService.assignLocationToUser(userId, locationId);
    return {
      success: true,
      message: 'Location assigned successfully',
    };
  }

  @Delete('users/:userId/location')
  @HttpCode(HttpStatus.OK)
  async removeUserLocation(@Param('userId') userId: string) {
    await locationAssignmentService.removeLocationFromUser(userId);
    return {
      success: true,
      message: 'Location removed successfully',
    };
  }

  @Get('agents')
  async getAgentsWithLocations(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Ensure database connection is ready before operations
    await this.databaseService.ensureConnectionReady();
    const verifiedConnection = this.databaseService.getConnection();
    
    const result = await locationAssignmentService.getAgentsWithLocations({
      search: search as string | undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    }, verifiedConnection);
    return {
      success: true,
      data: result,
    };
  }

  @Put('agents/:agentId/locations')
  @HttpCode(HttpStatus.OK)
  async assignAgentLocations(
    @Param('agentId') agentId: string,
    @Body('locationIds') locationIds: string[],
  ) {
    const result = await locationAssignmentService.assignLocationsToAgent(agentId, locationIds);
    return {
      success: true,
      data: result,
      message: `Successfully assigned ${result.success} location(s)`,
    };
  }

  @Put('locations/:locationId/transfer')
  @HttpCode(HttpStatus.OK)
  async transferLocation(
    @Param('locationId') locationId: string,
    @Body('newAgentId') newAgentId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const result = await locationAssignmentService.transferLocation(locationId, newAgentId, user._id.toString());
    return {
      success: true,
      data: result,
      message: 'Location transferred successfully',
    };
  }

  @Get('location-rates')
  async getAllLocationRates(
    @Query('locationId') locationId?: string,
    @Query('materialType') materialType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const rates = await locationItemTypeRateService.getAllLocationRates({
      locationId: locationId || undefined,
      materialType: materialType || undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return {
      success: true,
      data: rates,
    };
  }

  @Get('location-rates/:locationId')
  @Roles('admin', 'super_admin', 'agent')
  async getLocationRates(@Param('locationId') locationId: string) {
    // Ensure database connection is ready before operations
    await this.databaseService.ensureConnectionReady();
    const verifiedConnection = this.databaseService.getConnection();
    const rates = await locationItemTypeRateService.getLocationRates(locationId, verifiedConnection);
    return {
      success: true,
      data: rates,
    };
  }

  @Put('location-rates/:locationId')
  @HttpCode(HttpStatus.OK)
  async setLocationRates(
    @Param('locationId') locationId: string,
    @Body('rates') rates: any,
    @CurrentUser() user: UserDocument,
  ) {
    // Ensure database connection is ready before operations
    await this.databaseService.ensureConnectionReady();
    const verifiedConnection = this.databaseService.getConnection();

    const result = await locationItemTypeRateService.setLocationRates(
      locationId,
      rates,
      user._id.toString(),
      verifiedConnection,
    );
    return {
      success: true,
      data: result,
      message: 'Location rates updated successfully',
    };
  }
}
