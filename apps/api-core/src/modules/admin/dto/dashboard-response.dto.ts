import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardUsersDto {
  @IsNumber()
  total!: number;

  @IsNumber()
  active!: number;

  @IsNumber()
  inactive!: number;
}

export class DashboardProjectsDto {
  @IsNumber()
  total!: number;

  @IsNumber()
  today!: number;

  @IsNumber()
  collections!: number; // Alias for total (backward compatibility)
}

export class DashboardLocationsDto {
  @IsNumber()
  total!: number;
}

export class DashboardOverviewDto {
  @ValidateNested()
  @Type(() => DashboardUsersDto)
  users!: DashboardUsersDto;

  @ValidateNested()
  @Type(() => DashboardProjectsDto)
  projects!: DashboardProjectsDto;

  @ValidateNested()
  @Type(() => DashboardLocationsDto)
  locations!: DashboardLocationsDto;
}

export class TodayActivityDto {
  @IsNumber()
  newUsers!: number;

  @IsNumber()
  newProjects!: number;

  @IsNumber()
  newLocations!: number;

  @IsNumber()
  collections!: number; // Alias for newProjects (backward compatibility)

  @IsString()
  date!: string;
}

export class DashboardResponseDto {
  @ValidateNested()
  @Type(() => DashboardOverviewDto)
  overview!: DashboardOverviewDto;

  @ValidateNested()
  @Type(() => TodayActivityDto)
  today!: TodayActivityDto;

  @IsNumber()
  collections!: number; // Top-level alias for backward compatibility

  @ValidateNested()
  @Type(() => DashboardOverviewDto)
  stats?: DashboardOverviewDto;

  recentUsers?: unknown[];
}
