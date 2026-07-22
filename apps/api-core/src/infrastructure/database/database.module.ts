import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { QueryBuilderService } from './query-builder.service';
import { LoggerService, LoggerModule } from '../logger';

@Module({
  imports: [
    LoggerModule,
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService, loggerService: LoggerService) => {
        // Helper function to normalize MongoDB URI (fix malformed query strings)
        const normalizeMongoUri = (uri: string): string => {
          if (!uri) return uri;
          // Fix common issue: multiple ? in query string (should be &)
          // Pattern: ?param1=value1?param2=value2 should be ?param1=value1&param2=value2
          const questionMarkIndex = uri.indexOf('?');
          if (questionMarkIndex !== -1) {
            const beforeQuery = uri.substring(0, questionMarkIndex + 1);
            const queryString = uri.substring(questionMarkIndex + 1);
            // Replace all ? in query string with & (except the first one which is already part of beforeQuery)
            const normalizedQuery = queryString.replace(/\?/g, '&');
            return beforeQuery + normalizedQuery;
          }
          return uri;
        };

        // Get all config values
        let mongodbUri = configService.get<string>('mongodbUri');
        const nodeEnv = configService.get<string>('nodeEnv');

        // Normalize the URI to fix malformed query strings
        if (mongodbUri) {
          mongodbUri = normalizeMongoUri(mongodbUri);
        }

        loggerService.setContext('DatabaseModule');

        // Log detailed debugging information
        const maskedUri = mongodbUri
          ? mongodbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
          : '(not set)';
        const rawEnvVar = process.env.MONGODB_URI;
        const maskedEnvVar = rawEnvVar
          ? rawEnvVar.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
          : '(not set)';

        const isDevLog = (nodeEnv || process.env.NODE_ENV || 'development') === 'development' && !process.env.VERCEL;

        if (isDevLog) {
          loggerService.log('ConfigService values', {
            mongodbUri: maskedUri,
            nodeEnv,
            processEnvMongoUri: maskedEnvVar,
            processEnvMongoUriLength: rawEnvVar?.length || 0,
            cwd: process.cwd(),
          });
        }

        if (mongodbUri?.includes('localhost') || mongodbUri?.includes('127.0.0.1')) {
          if (rawEnvVar && !rawEnvVar.includes('localhost') && !rawEnvVar.includes('127.0.0.1')) {
            if (isDevLog) {
              loggerService.error('CRITICAL: ConfigService returned localhost but process.env.MONGODB_URI has correct value. Using process.env.');
            }
            const correctedUri = normalizeMongoUri(rawEnvVar);
            if (!correctedUri || correctedUri.trim() === '') {
              throw new Error('MongoDB URI is not configured. Please set MONGODB_URI environment variable.');
            }
            if (isDevLog) loggerService.log('Normalized MongoDB URI (fixed query string)');
            return {
              uri: correctedUri,
              serverSelectionTimeoutMS: 60000,
              socketTimeoutMS: 60000,
              connectTimeoutMS: 60000,
              maxPoolSize: 10,
              minPoolSize: 1,
              retryWrites: true,
              retryReads: true,
              readPreference: 'primaryPreferred',
              heartbeatFrequencyMS: 10000,
            };
          }
        }

        if (!mongodbUri || mongodbUri.trim() === '') {
          loggerService.error('MongoDB URI is empty or not configured!');
          loggerService.error('Please set MONGODB_URI environment variable.');
          throw new Error('MongoDB URI is not configured. Please set MONGODB_URI environment variable.');
        }

        const isLocalMongo = mongodbUri?.includes('localhost') || mongodbUri?.includes('127.0.0.1');
        const isProduction = nodeEnv === 'production';

        // In development with local MongoDB, use shorter timeouts to fail fast
        // This prevents long retry delays when MongoDB is not running
        const serverSelectionTimeoutMS = isLocalMongo ? 1000 : isProduction ? 60000 : 30000;
        const connectTimeoutMS = isLocalMongo ? 1000 : isProduction ? 60000 : 30000;

        return {
          uri: mongodbUri,
          serverSelectionTimeoutMS,
          socketTimeoutMS: isLocalMongo ? 5000 : isProduction ? 60000 : 45000,
          connectTimeoutMS,
          maxPoolSize: 20,
          minPoolSize: 1,
          bufferCommands: false,
          retryWrites: true,
          retryReads: true,
          readPreference: 'primaryPreferred',
          heartbeatFrequencyMS: isLocalMongo ? 5000 : 10000,
        };
      },
      inject: [ConfigService, LoggerService],
    }),
  ],
  providers: [DatabaseService, QueryBuilderService],
  exports: [DatabaseService, QueryBuilderService, MongooseModule],
})
export class DatabaseModule { }
