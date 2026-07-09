import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { User, UserDocument } from '../user/schemas/user.schema';
import { TokenBlacklist, TokenBlacklistDocument } from './schemas/token-blacklist.schema';
import { PasswordResetToken, PasswordResetTokenDocument } from './schemas/password-reset-token.schema';
import { JwtService, TokenPayload } from '../../common/services/jwt.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../infrastructure/mail/mail.service';
import { TokenBlacklistService } from '../../common/services/token-blacklist.service';
import { UserResponse } from '../user/interfaces/user-response.interface';

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
  accessToken?: string;
  refreshToken?: string;
  isNewUser?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TokenBlacklist.name) private tokenBlacklistModel: Model<TokenBlacklistDocument>,
    @InjectModel(PasswordResetToken.name) private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async loginUser(data: LoginData): Promise<AuthResponse> {
    const emailLower = data.email.toLowerCase();
    
    // Find user, excluding deleted users
    const user = await this.userModel
      .findOne({
        email: emailLower,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      })
      .populate('defaultLocation', 'locationName locality address city state zipCode locationType usageCount lastUsedAt')
      .exec();

    if (!user) {
      // Debug: Check if user exists without filters
      const userWithoutFilters = await this.userModel.findOne({ email: emailLower }).exec();
      if (userWithoutFilters) {
        this.logger.warn(`User found but excluded by filters: email=${emailLower}, isDeleted=${userWithoutFilters.isDeleted}, deletedAt=${userWithoutFilters.deletedAt}`);
      } else {
        this.logger.warn(`User not found: email=${emailLower}`);
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      this.logger.warn(`User account is inactive: email=${emailLower}`);
      throw new ForbiddenException('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await (user as any).comparePassword(data.password);
    if (!isPasswordValid) {
      this.logger.warn(`Password mismatch for user: email=${emailLower}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.generateToken(tokenPayload);
    const refreshToken = this.jwtService.generateRefreshToken(tokenPayload);

    const userObj = user.toObject();
    const { password: _password, ...userWithoutPassword } = userObj;

    return {
      user: {
        ...userWithoutPassword,
        _id: user._id.toString(),
        createdAt: (user as any).createdAt || new Date(),
        updatedAt: (user as any).updatedAt || new Date(),
      } as UserResponse,
      token,
      accessToken: token,
      refreshToken,
      isNewUser: false,
    };
  }

  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .populate('defaultLocation', 'locationName locality address city state zipCode locationType usageCount lastUsedAt')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    return {
      ...user,
      _id: user._id.toString(),
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    } as UserResponse;
  }

  async refreshAccessToken(refreshToken: string): Promise<{ token: string; accessToken: string; refreshToken: string }> {
    try {
      const decoded = this.jwtService.verifyRefreshToken(refreshToken);

      const user = await this.userModel.findById(decoded.userId).select('-password').exec();
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokenPayload: TokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const newToken = this.jwtService.generateToken(tokenPayload);
      const newRefreshToken = this.jwtService.generateRefreshToken(tokenPayload);

      return {
        token: newToken,
        accessToken: newToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload | null;

      if (!decoded || !decoded.exp) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await this.tokenBlacklistService.blacklistToken(token, expiresAt);
        return;
      }

      const expiresAt = new Date(decoded.exp * 1000);
      await this.tokenBlacklistService.blacklistToken(token, expiresAt);
    } catch (error) {
      this.logger.error('Error blacklisting token:', error);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.tokenBlacklistService.isTokenBlacklisted(token);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).exec();

    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.passwordResetTokenModel.create({
      userId: user._id,
      token: resetToken,
      expiresAt,
      used: false,
    });

    const adminPanelUrl = this.configService.get<string>('adminPanelUrl');
    const resetUrl = `${adminPanelUrl}/reset-password?token=${resetToken}`;

    await this.mailService.sendPasswordResetEmail(user, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokenModel
      .findOne({
        token,
        used: false,
        expiresAt: { $gt: new Date() },
      })
      .populate('userId')
      .exec();

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userModel.findById((resetToken.userId as any)._id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    user.password = newPassword;
    await user.save();

    resetToken.used = true;
    await resetToken.save();

    await this.mailService.sendPasswordResetConfirmationEmail(user);
  }
}
