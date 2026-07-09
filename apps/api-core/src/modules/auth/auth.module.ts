import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from '../user/schemas/user.schema';
import { TokenBlacklist, TokenBlacklistSchema } from './schemas/token-blacklist.schema';
import { PasswordResetToken, PasswordResetTokenSchema } from './schemas/password-reset-token.schema';
import { MailModule } from '../../infrastructure/mail/mail.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    MailModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
