import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserResponse } from './interfaces/user-response.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
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

    const userObj = user.toObject() as any;
    const { password: _password, ...userWithoutPassword } = userObj;

    return {
      ...userWithoutPassword,
      _id: userWithoutPassword._id.toString(),
      createdAt: userObj.createdAt || new Date(),
      updatedAt: userObj.updatedAt || new Date(),
    } as UserResponse;
  }

  async changePassword(
    userId: string,
    data: ChangePasswordDto,
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
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = data.newPassword;
    await user.save();
  }
}
