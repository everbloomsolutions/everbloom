import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserResponse } from './interfaces/user-response.interface';
import { logAuditEvent } from '../audit/audit.helper';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateOnboardingProfileDto } from './dto/update-onboarding-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
    req?: any,
  ): Promise<UserResponse> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: userId },
      }).exec();

      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }

      user.email = data.email.toLowerCase();
    }

    if (data.name !== undefined) {
      user.name = data.name;
    }

    await user.save();

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (data.email !== undefined && data.email.toLowerCase() !== user.email) {
      changes.email = { old: data.email.toLowerCase(), new: user.email };
    }
    if (data.name !== undefined && data.name !== user.name) {
      changes.name = { old: data.name, new: user.name };
    }

    const userObj = user.toObject() as any;
    const { password: _password, ...userWithoutPassword } = userObj;

    const response = {
      ...userWithoutPassword,
      _id: userWithoutPassword._id.toString(),
      createdAt: userObj.createdAt || new Date(),
      updatedAt: userObj.updatedAt || new Date(),
    } as UserResponse;

    void logAuditEvent(
      {
        entityType: 'user',
        entityId: response._id,
        action: 'user_updated',
        description: 'User profile updated',
        performedBy: userId,
        changes,
      },
      req,
    );

    return response;
  }

  async changePassword(
    userId: string,
    data: ChangePasswordDto,
    req?: any,
  ): Promise<void> {
    // Validate password confirmation
    if (data.newPassword !== data.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    const isPasswordValid = await (user as any).comparePassword(data.currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = data.newPassword;
    await user.save();

    void logAuditEvent(
      {
        entityType: 'user',
        entityId: userId,
        action: 'user_updated',
        description: 'User password changed',
        performedBy: userId,
      },
      req,
    );
  }

  async getOnboardingStatus(userId: string): Promise<{ onboardingCompleted: boolean; profileComplete: number }> {
    const user = await this.userModel.findById(userId).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const fields = [user.name, user.email, user.phoneNumber, user.company];
    const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
    const profileComplete = Math.round((filled / fields.length) * 100);

    return {
      onboardingCompleted: user.onboardingCompleted ?? false,
      profileComplete,
    };
  }

  async updateOnboardingProfile(
    userId: string,
    data: UpdateOnboardingProfileDto,
  ): Promise<UserResponse> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
    if (data.company !== undefined) user.company = data.company;

    await user.save();

    const userObj = user.toObject() as any;
    const { password: _password, ...userWithoutPassword } = userObj;

    return {
      ...userWithoutPassword,
      _id: userWithoutPassword._id.toString(),
      createdAt: userObj.createdAt || new Date(),
      updatedAt: userObj.updatedAt || new Date(),
    } as UserResponse;
  }

  async completeOnboarding(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    user.onboardingCompleted = true;
    await user.save();
  }
}
