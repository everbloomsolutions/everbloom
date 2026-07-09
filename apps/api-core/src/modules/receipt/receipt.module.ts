import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Receipt, ReceiptSchema } from './schemas/receipt.schema';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Receipt.name, schema: ReceiptSchema }]),
    ProjectModule, // Receipt depends on Project module
  ],
  controllers: [ReceiptController],
  providers: [ReceiptService],
  exports: [ReceiptService, MongooseModule],
})
export class ReceiptModule {}
