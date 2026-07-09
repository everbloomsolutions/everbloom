import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

/**
 * No-op SocketGateway when running on Vercel serverless.
 * WebSockets are not supported in serverless; real-time emits are skipped.
 */
@Injectable()
export class SocketGatewayNoOp {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('SocketGatewayNoOp');
  }

  emitToUser(_userId: string, _event: string, _data: unknown): void {
    // No-op: WebSockets not available on Vercel
  }

  emitToRole(_role: string, _event: string, _data: unknown): void {
    // No-op
  }

  emitToAll(_event: string, _data: unknown): void {
    // No-op
  }
}
