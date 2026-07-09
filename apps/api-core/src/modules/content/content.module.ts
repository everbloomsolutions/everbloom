import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contact, ContactSchema } from './schemas/contact.schema';
import { ContactController, ContactAdminController } from './contact.controller';
import { ContactService } from './contact.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Contact.name, schema: ContactSchema }]),
    CommonModule, // For EmailService
  ],
  controllers: [ContactController, ContactAdminController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContentModule {}
