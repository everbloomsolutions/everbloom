import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { QueryBuilderService } from './query-builder.service';
import { LoggerModule } from '../logger';
import { configuration } from '../../config/configuration';

const dbConfig = configuration();
const rawMongodbUri = dbConfig.mongodbUri || '';
const normalizedMongodbUri = (() => {
  if (!rawMongodbUri) return rawMongodbUri;
  const trimmed = rawMongodbUri.trim();
  const questionMarkIndex = trimmed.indexOf('?');
  if (questionMarkIndex !== -1) {
    const beforeQuery = trimmed.substring(0, questionMarkIndex + 1);
    const queryString = trimmed.substring(questionMarkIndex + 1);
    const normalizedQuery = queryString.replace(/\?/g, '&');
    return beforeQuery + normalizedQuery;
  }
  return trimmed;
})();

const nodeEnv = dbConfig.nodeEnv || 'development';
const isVercel = dbConfig.isVercel || false;
const isLocalMongo =
  normalizedMongodbUri.includes('localhost') ||
  normalizedMongodbUri.includes('127.0.0.1');
const isProduction = nodeEnv === 'production';

if (normalizedMongodbUri.trim() === '') {
  // eslint-disable-next-line no-console
  console.error('MongoDB URI is empty or not configured!');
  // eslint-disable-next-line no-console
  console.error('Please set MONGODB_URI environment variable.');
  throw new Error('MongoDB URI is not configured. Please set MONGODB_URI environment variable.');
}

const isDevLog = nodeEnv === 'development' && !isVercel;
if (isDevLog) {
  const maskedUri = normalizedMongodbUri.replace(/\/\/[^:@]+:[^@]+@/, '//***:***@');
  // eslint-disable-next-line no-console
  console.log('DatabaseModule config values', {
    mongodbUri: maskedUri,
    nodeEnv,
    cwd: process.cwd(),
  });
}

const serverSelectionTimeoutMS = isLocalMongo ? 10000 : isProduction ? 60000 : 30000;
const connectTimeoutMS = isLocalMongo ? 10000 : isProduction ? 60000 : 30000;

@Module({
  imports: [
    LoggerModule,
    MongooseModule.forRoot(normalizedMongodbUri, {
      serverSelectionTimeoutMS,
      socketTimeoutMS: isLocalMongo ? 60000 : isProduction ? 60000 : 45000,
      connectTimeoutMS,
      maxPoolSize: 20,
      minPoolSize: isLocalMongo ? 5 : 1,
      bufferCommands: false,
      retryWrites: isLocalMongo ? false : true,
      retryReads: isLocalMongo ? false : true,
      readPreference: isLocalMongo ? 'primary' : 'primaryPreferred',
      heartbeatFrequencyMS: isLocalMongo ? 10000 : 10000,
      minHeartbeatFrequencyMS: isLocalMongo ? 10000 : 10000,
      directConnection: isLocalMongo,
    }),
  ],
  providers: [DatabaseService, QueryBuilderService],
  exports: [DatabaseService, QueryBuilderService, MongooseModule],
})
export class DatabaseModule { }
