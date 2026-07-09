import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schemas/location.schema';
import { LocationController } from './location.controller';
import { LocationService, setLocationServiceInstance } from './location.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Location.name, schema: LocationSchema }]),
    CommonModule, // Provides PaginationService, ValidationService, DatabaseService
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService, MongooseModule],
})
export class LocationModule implements OnModuleInit {
  constructor(private readonly locationService: LocationService) {}

  onModuleInit() {
    // Initialize the service instance for Express wrapper functions
    setLocationServiceInstance(this.locationService);
  }
}
