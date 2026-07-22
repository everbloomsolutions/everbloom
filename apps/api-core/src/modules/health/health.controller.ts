import { Controller, Get, HttpStatus, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Request, Response } from 'express';
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

  @Get('live')
  getLive() {
    return {
      success: true,
      message: 'Alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReady(@Res({ passthrough: true }) res: Response) {
    return this.runReadinessCheck(res);
  }

  @Get('detailed')
  async getDetailedHealth(@Res({ passthrough: true }) res: Response) {
    return this.runReadinessCheck(res);
  }

  private runReadinessCheck(res: Response) {
    const dbHealth = this.mongooseConnection.readyState === 1;
    const redisHealth = this.redisService.isConnected();
    const isReady = dbHealth && redisHealth;
    const status = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(status);

    return {
      success: isReady,
      message: isReady ? 'Server is healthy' : 'Server is unhealthy',
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
