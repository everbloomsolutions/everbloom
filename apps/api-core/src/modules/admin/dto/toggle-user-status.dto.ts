import { IsBoolean } from 'class-validator';

export class ToggleUserStatusDto {
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive!: boolean;
}
