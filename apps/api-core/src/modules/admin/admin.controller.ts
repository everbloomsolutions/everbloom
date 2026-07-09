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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService, UserAdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';
import * as locationAssignmentService from '../location/location.assignment.service';
import { ProjectService } from '../project/project.service';
import { LocationService } from '../location/location.service';
import { archiveDuplicateUsers } from './user-admin.service';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userAdminService: UserAdminService,
    private readonly projectService: ProjectService,
    private readonly locationService: LocationService,
  ) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getStats() {
    const stats = await this.adminService.getAdminStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('archived/locations')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getDeletedLocations(@Query() query: any) {
    const result = await this.locationService.getDeletedLocations(query);
    return {
      success: true,
      data: result,
    };
  }

  @Post('archived/locations/:id/restore')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async restoreLocation(@Param('id') id: string) {
    const location = await this.locationService.restoreLocation(id);
    return {
      success: true,
      data: location,
      message: 'Location restored successfully',
    };
  }

  @Delete('archived/locations/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async permanentlyDeleteLocation(@Param('id') id: string) {
    await this.locationService.permanentlyDeleteLocation(id);
    return {
      success: true,
      message: 'Location permanently deleted',
    };
  }

  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getAnalytics() {
    // For now, return general admin stats as analytics
    const stats = await this.adminService.getAdminStats();
    return {
      success: true,
      data: {
        ...stats,
        note: 'For detailed collection analytics, use /admin/collections/analytics endpoints',
      },
    };
  }

  // More specific routes must come before general ones
  @Get('dashboard/today/performance')
  async getTodayPerformance(@CurrentUser() user: UserDocument) {
    // This endpoint was removed during dashboard simplification
    // Return today's activity data as a fallback
    const todayData = await this.adminService.getTodayActivity(
      user._id.toString(),
      user.role,
    );
    
    return {
      success: true,
      data: todayData,
      message: 'This endpoint has been consolidated. Use /api/v1/admin/dashboard/today instead.',
    };
  }

  @Get('dashboard/today')
  async getTodayActivity(@CurrentUser() user: UserDocument) {
    const todayData = await this.adminService.getTodayActivity(
      user._id.toString(),
      user.role,
    );
    
    // Ensure collections is always present (defensive check)
    // Also ensure all numeric values are properly set
    const safeData = {
      newUsers: Number(todayData.newUsers) || 0,
      newProjects: Number(todayData.newProjects) || 0,
      newLocations: Number(todayData.newLocations) || 0,
      collections: Number(todayData.collections ?? todayData.newProjects ?? 0),
      date: todayData.date || new Date().toISOString().split('T')[0],
    };

    // Log for debugging (remove in production if needed)
    if (typeof safeData.collections === 'undefined' || safeData.collections === null) {
      console.warn('[AdminController] Collections is undefined/null in getTodayActivity:', {
        todayData,
        safeData,
      });
    }

    return {
      success: true,
      data: safeData,
    };
  }

  @Get('dashboard/recent')
  async getRecentData(@CurrentUser() user: UserDocument) {
    // This endpoint was removed during dashboard simplification
    // Return dashboard data as a fallback
    const dashboardData = await this.adminService.getDashboard(
      user._id.toString(),
      user.role,
    );
    
    return {
      success: true,
      data: dashboardData,
      message: 'This endpoint has been consolidated. Use /api/v1/admin/dashboard instead.',
    };
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: UserDocument) {
    const dashboardData = await this.adminService.getDashboard(
      user._id.toString(),
      user.role,
    );
    
    // Ensure collections is always present at all levels (defensive check)
    const safeData = {
      ...dashboardData,
      collections: dashboardData.collections ?? dashboardData.today?.collections ?? dashboardData.today?.newProjects ?? dashboardData.overview?.projects?.total ?? 0,
    };

    // Ensure nested structures have collections
    if (safeData.today && typeof safeData.today.collections === 'undefined') {
      safeData.today.collections = safeData.today.newProjects ?? 0;
    }
    if (safeData.overview?.projects && typeof safeData.overview.projects.collections === 'undefined') {
      safeData.overview.projects.collections = safeData.overview.projects.total ?? 0;
    }

    return {
      success: true,
      data: safeData,
    };
  }

  @Get('archived/collections')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getArchivedCollectionsAlias(
    @Query() query: any,
    @CurrentUser() user: UserDocument,
  ) {
    const result = await this.projectService.getDeletedCollections({
      ...query,
      userId: user._id.toString(),
      userRole: user.role,
    });
    return {
      success: true,
      data: result,
    };
  }

  @Post('archived/collections/:id/restore')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async restoreCollection(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const project = await this.projectService.restoreCollection(id, user._id.toString());
    return {
      success: true,
      data: project,
      message: 'Collection restored successfully',
    };
  }

  @Delete('archived/collections/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async permanentlyDeleteCollection(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    await this.projectService.permanentlyDeleteCollection(id, user._id.toString());
    return {
      success: true,
      message: 'Collection permanently deleted',
    };
  }


  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getUsers(@Query() query: UserQueryDto) {
    const result = await this.userAdminService.getUsers(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('users/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'agent')
  async getUserStats(@CurrentUser() user: UserDocument) {
    const stats = await this.userAdminService.getUserStats(user.role);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getUserById(@Param('id') id: string) {
    const user = await this.userAdminService.getUserById(id);
    return {
      success: true,
      data: user,
    };
  }

  @Post('users')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: UserDocument,
  ) {
    const newUser = await this.userAdminService.createUser(createUserDto, user.role);
    return {
      success: true,
      data: newUser,
      message: 'User created successfully',
    };
  }

  @Put('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: UserDocument,
  ) {
    const updatedUser = await this.userAdminService.updateUser(id, updateUserDto, user.role);
    return {
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    };
  }

  @Patch('users/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async toggleUserStatus(
    @Param('id') id: string,
    @Body() toggleUserStatusDto: ToggleUserStatusDto,
  ) {
    const user = await this.userAdminService.toggleUserStatus(id, toggleUserStatusDto.isActive);
    return {
      success: true,
      data: user,
      message: `User ${toggleUserStatusDto.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  @Delete('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    await this.userAdminService.deleteUser(id, user.role);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Put('users/:id/default-location')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async setUserDefaultLocation(
    @Param('id') id: string,
    @Body('locationId') locationId: string,
  ) {
    await locationAssignmentService.assignLocationToUser(id, locationId);
    return {
      success: true,
      message: 'Default location assigned successfully',
    };
  }

  @Delete('users/:id/default-location')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async removeUserDefaultLocation(@Param('id') id: string) {
    await locationAssignmentService.removeLocationFromUser(id);
    return {
      success: true,
      message: 'Default location removed successfully',
    };
  }

  @Put('users/:id/assigned-locations')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async setAgentLocations(
    @Param('id') id: string,
    @Body('locationIds') locationIds: string[],
  ) {
    const result = await locationAssignmentService.assignLocationsToAgent(id, locationIds);
    return {
      success: true,
      data: result,
      message: `Successfully assigned ${result.success} location(s) to agent`,
    };
  }

  @Get('archived/users')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getDeletedUsers(@Query() query: any) {
    const result = await this.userAdminService.getDeletedUsers(query);
    return {
      success: true,
      data: result,
    };
  }

  @Post('users/archive-duplicates')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async archiveDuplicateUsers(@Body() body: any) {
    const mode = body?.mode === 'apply' ? 'apply' : 'dry-run';
    const limitGroups = typeof body?.limitGroups === 'number' ? body.limitGroups : undefined;
    const report = await archiveDuplicateUsers({ mode, limitGroups });
    return {
      success: true,
      data: report,
    };
  }

  @Post('archived/users/:id/restore')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async restoreUser(@Param('id') id: string) {
    const user = await this.userAdminService.restoreUser(id);
    return {
      success: true,
      data: user,
      message: 'User restored successfully',
    };
  }

  @Delete('archived/users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async permanentlyDeleteUser(@Param('id') id: string) {
    await this.userAdminService.permanentlyDeleteUser(id);
    return {
      success: true,
      message: 'User permanently deleted',
    };
  }
}
