import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class ArchiveDuplicatesDto {
  @IsOptional()
  @IsEnum(['dry-run', 'apply'], { message: 'mode must be "dry-run" or "apply"' })
  mode?: 'dry-run' | 'apply';

  @IsOptional()
  @IsNumber({}, { message: 'limitGroups must be a number' })
  limitGroups?: number;
}
