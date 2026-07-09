import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from './services/jwt.service';
import { MailModule } from '../infrastructure/mail/mail.module';
import { User, UserSchema } from '../modules/user/schemas/user.schema';
import { TokenBlacklist, TokenBlacklistSchema } from '../modules/auth/schemas/token-blacklist.schema';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { PaginationModule } from './pagination/pagination.module';
import { ValidationModule } from './validation/validation.module';
import { SanitizeModule } from './sanitize/sanitize.module';
import { CloudinaryModule } from '../infrastructure/cloudinary/cloudinary.module';
import { ExportModule } from '../infrastructure/export/export.module';
import { PdfModule } from '../infrastructure/export/pdf.module';
import { DatabaseModule } from '../infrastructure/database/database.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
    ]),
    MailModule,
    PaginationModule,
    ValidationModule,
    SanitizeModule,
    CloudinaryModule,
    ExportModule,
    PdfModule,
    DatabaseModule,
  ],
  providers: [
    JwtService,
    TokenBlacklistService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    JwtService,
    TokenBlacklistService,
    AuthGuard,
    RolesGuard,
    MongooseModule,
    MailModule,
    PaginationModule,
    ValidationModule,
    SanitizeModule,
    CloudinaryModule,
    ExportModule,
    PdfModule,
    DatabaseModule,
  ],
})
export class CommonModule {}
