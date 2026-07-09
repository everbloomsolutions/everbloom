import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Request } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { LoggerService } from '../../infrastructure/logger/logger.service';

@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService,
    @InjectConnection() private mongooseConnection: Connection,
    private redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('HealthController');
  }

  @Get()
  getHealth() {
    return {
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('nodeEnv'),
      port: this.configService.get<number>('port'),
      host: this.configService.get<string>('host'),
    };
  }

  @Get('detailed')
  async getDetailedHealth() {
    const dbHealth = this.mongooseConnection.readyState === 1;
    const redisHealth = this.redisService.isConnected();

    const _status = dbHealth ? 200 : 503;

    return {
      success: dbHealth,
      message: dbHealth ? 'Server is healthy' : 'Server is unhealthy',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('nodeEnv'),
      services: {
        database: {
          status: dbHealth ? 'connected' : 'disconnected',
          readyState: this.mongooseConnection.readyState,
          readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][
            this.mongooseConnection.readyState
          ] || 'unknown',
          host: this.mongooseConnection.host,
          port: this.mongooseConnection.port,
          name: this.mongooseConnection.name,
        },
        redis: {
          status: redisHealth ? 'connected' : 'disconnected',
        },
      },
    };
  }

  @Get('cors-test')
  getCorsTest(@Req() req: Request) {
    this.logger.log('CORS test endpoint called', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      headers: {
        origin: req.headers.origin,
        'access-control-request-method': req.headers['access-control-request-method'],
      },
    });
    return {
      success: true,
      message: 'CORS test endpoint',
      origin: req.headers.origin,
      timestamp: new Date().toISOString(),
    };
  }
}
