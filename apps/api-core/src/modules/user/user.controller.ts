import {
  Controller,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from './schemas/user.schema';

@Controller('profile')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('update')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.userService.updateProfile(
      user._id.toString(),
      updateProfileDto,
    );
    return {
      success: true,
      data: { user: updatedUser },
      message: 'Profile updated successfully',
    };
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: UserDocument,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(
      user._id.toString(),
      changePasswordDto,
    );
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}
