import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: RedisClientType | null) {}

  getClient(): RedisClientType | null {
    return this.client;
  }

  isConnected(): boolean {
    return this.client?.isOpen ?? false;
  }
}
