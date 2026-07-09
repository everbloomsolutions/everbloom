import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectController, ProjectAdminController } from './project.controller';
import { ProjectService, setProjectServiceInstance } from './project.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    CommonModule, // Provides PaginationService, ValidationService, DatabaseService
  ],
  controllers: [ProjectController, ProjectAdminController],
  providers: [ProjectService],
  exports: [ProjectService, MongooseModule],
})
export class ProjectModule implements OnModuleInit {
  constructor(private readonly projectService: ProjectService) {}

  onModuleInit() {
    // Initialize the service instance for Express wrapper functions
    setProjectServiceInstance(this.projectService);
  }
}
