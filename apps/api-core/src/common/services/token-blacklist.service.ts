import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenBlacklist, TokenBlacklistDocument } from '../../modules/auth/schemas/token-blacklist.schema';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    @InjectModel(TokenBlacklist.name)
    private tokenBlacklistModel: Model<TokenBlacklistDocument>,
  ) {}

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await this.tokenBlacklistModel.findOne({ token }).exec();
      return blacklistedToken !== null;
    } catch (error) {
      this.logger.error('Error checking token blacklist:', error);
      return false;
    }
  }

  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    try {
      await this.tokenBlacklistModel.create({
        token,
        expiresAt,
      });
    } catch (error) {
      this.logger.error('Error blacklisting token:', error);
    }
  }

  // Alias for test compatibility and external callers
  async addToBlacklist(token: string, _userId?: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    return this.blacklistToken(token, expiresAt);
  }
}
