import { IsOptional, IsString } from 'class-validator';

export class ImportDataDto {
  @IsOptional()
  @IsString({ message: 'csvData must be a string' })
  csvData?: string;
}
