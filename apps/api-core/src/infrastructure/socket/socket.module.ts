import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGateway } from './socket.gateway';
import { SocketGatewayNoOp } from './socket-noop.gateway';
import { LoggerModule } from '../logger/logger.module';
import { User, UserSchema } from '../../modules/user/schemas/user.schema';
import { CommonModule } from '../../common/common.module';

const baseImports = [
  MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  LoggerModule,
  CommonModule,
];

/**
 * Socket (WebSocket) module. Must be imported via SocketModule.forRoot() in all consumers
 * (AppModule, NotificationModule, etc.) so Nest can resolve SocketGateway.
 */
@Module({})
export class SocketModule {
  /**
   * Register SocketModule. On Vercel (serverless), use no-op gateway;
   * WebSockets are not supported in serverless.
   */
  static forRoot(isVercel?: boolean): DynamicModule {
    const vercel = isVercel ?? false;
    const providers = vercel
      ? [{ provide: SocketGateway, useClass: SocketGatewayNoOp }]
      : [SocketGateway];

    return {
      module: SocketModule,
      global: true,
      imports: baseImports,
      providers,
      exports: [SocketGateway],
    };
  }
}
