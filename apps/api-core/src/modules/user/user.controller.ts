import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateOnboardingProfileDto } from './dto/update-onboarding-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from './schemas/user.schema';

@Controller('profile')
export class UserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

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
      data: updatedUser,
      message: 'Profile updated successfully',
    };
  }

  @Put('change-password')
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

  @Get('onboarding/status')
  @UseGuards(AuthGuard)
  async getOnboardingStatus(@CurrentUser() user: UserDocument) {
    const status = await this.userService.getOnboardingStatus(
      user._id.toString(),
    );
    return {
      success: true,
      data: status,
    };
  }

  @Patch('onboarding/profile')
  @UseGuards(AuthGuard)
  async updateOnboardingProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateOnboardingProfileDto: UpdateOnboardingProfileDto,
  ) {
    const updatedUser = await this.userService.updateOnboardingProfile(
      user._id.toString(),
      updateOnboardingProfileDto,
    );
    return {
      success: true,
      data: updatedUser,
      message: 'Onboarding profile updated successfully',
    };
  }

  @Post('onboarding/complete')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(@CurrentUser() user: UserDocument) {
    await this.userService.completeOnboarding(user._id.toString());
    return {
      success: true,
      message: 'Onboarding completed successfully',
    };
  }
}
