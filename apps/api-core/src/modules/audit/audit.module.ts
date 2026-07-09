import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditController } from './audit.controller';
import { AuditService, setAuditServiceInstance } from './audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService, MongooseModule],
})
export class AuditModule implements OnModuleInit {
  constructor(private readonly auditService: AuditService) {}

  onModuleInit() {
    // Initialize the service instance for Express wrapper functions
    setAuditServiceInstance(this.auditService);
  }
}
