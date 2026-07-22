import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../common/services/jwt.service';
import { TokenBlacklistService } from '../../common/services/token-blacklist.service';
import { LoggerService } from '../logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../modules/user/schemas/user.schema';
import { isProduction } from '../../config/helpers';
import { formatAllowedOriginsForLog, resolveAllowedOrigins } from '../../config/url-normalization';

type SocketUser = Pick<UserDocument, '_id' | 'role' | 'isActive' | 'email'>;

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

@Injectable()
@WebSocketGateway({
  cors: {
    // Fail closed by default; afterInit binds the real origin validator.
    origin: ((_origin: string, callback: (err?: Error, allow?: boolean) => void) =>
      callback(new Error('CORS origin not allowed'), false)) as any,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  // Proxy-friendly defaults (Nginx, etc.)
  pingTimeout: 20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  private readonly blacklistCache = new Map<string, { value: boolean; expiresAtMs: number }>();
  private readonly BLACKLIST_CACHE_TTL_MS = isProduction() ? 30_000 : 5_000;

  private readonly userCache = new Map<string, { value: SocketUser; expiresAtMs: number }>();
  private readonly USER_CACHE_TTL_MS = isProduction() ? 30_000 : 5_000;

  private readonly authFailBudget = new Map<string, { count: number; resetAtMs: number }>();
  private readonly AUTH_FAIL_WINDOW_MS = isProduction() ? 60_000 : 30_000;
  private readonly AUTH_FAIL_LIMIT = isProduction() ? 10 : 25;

  private activeConnections = 0;
  private totalConnections = 0;
  private totalDisconnects = 0;
  private totalAuthSuccess = 0;
  private totalAuthFailure = 0;
  private allowedOrigins: string[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly loggerService: LoggerService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.loggerService.setContext('SocketGateway');
  }

  afterInit(server: Server): void {
    // Resolve allowed origins through DI and bind the CORS validator to this instance.
    this.allowedOrigins = this.getAllowedOrigins();
    (server as any).opts.cors.origin = this.handleCorsOrigin.bind(this);

    this.loggerService.log('Socket.io server initialized', {
      allowedOrigins: formatAllowedOriginsForLog(this.allowedOrigins),
    });

    // Authentication middleware for socket connections
    server.use(async (socket: AuthenticatedSocket, next) => {
      const AUTH_TIMEOUT_MS = isProduction() ? 15000 : 5000;

      try {
        const authStartMs = Date.now();
        const ip =
          (socket.handshake.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
          socket.handshake.address ||
          'unknown';

        const checkBudgetAndMaybeThrow = (key: string) => {
          const nowMs = Date.now();
          const existing = this.authFailBudget.get(key);
          if (existing && existing.resetAtMs > nowMs) {
            if (existing.count >= this.AUTH_FAIL_LIMIT) {
              throw new Error('Too many authentication attempts');
            }
            return;
          }
          this.authFailBudget.set(key, { count: 0, resetAtMs: nowMs + this.AUTH_FAIL_WINDOW_MS });
        };

        const recordFailure = (key: string) => {
          const nowMs = Date.now();
          const existing = this.authFailBudget.get(key);
          if (!existing || existing.resetAtMs <= nowMs) {
            this.authFailBudget.set(key, { count: 1, resetAtMs: nowMs + this.AUTH_FAIL_WINDOW_MS });
            return;
          }
          existing.count += 1;
        };

        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        const tokenFingerprint = token ? token.slice(0, 16) : 'no-token';
        const budgetKey = `ip:${ip}|tok:${tokenFingerprint}`;
        checkBudgetAndMaybeThrow(budgetKey);

        if (!token) {
          this.loggerService.warn('Socket missing auth token', {
            socketId: socket.id,
            origin: socket.handshake.headers.origin,
          });
          recordFailure(budgetKey);
          return next(new Error('Authentication required'));
        }

        // Authenticate with a cancellable timeout
        await this.withTimeout(async (signal) => {
          // Check if token is blacklisted
          const nowMs = Date.now();
          const cached = this.blacklistCache.get(token);
          let isBlacklisted: boolean;
          const blacklistStartMs = Date.now();
          if (cached && cached.expiresAtMs > nowMs) {
            isBlacklisted = cached.value;
          } else {
            isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
            if (signal.aborted) throw new Error('Authentication timeout');
            this.blacklistCache.set(token, {
              value: isBlacklisted,
              expiresAtMs: nowMs + this.BLACKLIST_CACHE_TTL_MS,
            });
          }
          const blacklistDurationMs = Date.now() - blacklistStartMs;
          if (isBlacklisted) {
            throw new Error('Token has been revoked');
          }

          const decoded = this.jwtService.verifyToken(token);
          const userId = decoded.userId;

          const nowUserMs = Date.now();
          const cachedUser = this.userCache.get(userId);
          const userStartMs = Date.now();
          const user =
            cachedUser && cachedUser.expiresAtMs > nowUserMs
              ? cachedUser.value
              : await this.userModel
                  .findById(userId)
                  .select('_id role isActive email')
                  .lean()
                  .exec();
          if (signal.aborted) throw new Error('Authentication timeout');
          const userDurationMs = Date.now() - userStartMs;

          if (!user) {
            recordFailure(budgetKey);
            throw new Error('User not found');
          }

          if (!user.isActive) {
            recordFailure(budgetKey);
            throw new Error('User account is inactive');
          }

          if (!cachedUser || cachedUser.expiresAtMs <= nowUserMs) {
            this.userCache.set(userId, {
              value: user as unknown as SocketUser,
              expiresAtMs: nowUserMs + this.USER_CACHE_TTL_MS,
            });
          }

          if (signal.aborted) throw new Error('Authentication timeout');

          socket.user = user as unknown as SocketUser;

          const authDurationMs = Date.now() - authStartMs;
          this.totalAuthSuccess += 1;
          if (!isProduction() || authDurationMs > 250) {
            this.loggerService.log('socket_auth_ok', {
              event: 'socket_auth_ok',
              socketId: socket.id,
              userId,
              role: (socket.user as any)?.role,
              durationMs: authDurationMs,
              blacklistDurationMs,
              userDurationMs,
              blacklistCacheHit: Boolean(cached && cached.expiresAtMs > nowMs),
              userCacheHit: Boolean(cachedUser && cachedUser.expiresAtMs > nowUserMs),
            });
          }
        }, AUTH_TIMEOUT_MS, 'Authentication timeout');

        next();
      } catch (error) {
        this.totalAuthFailure += 1;
        const ip =
          (socket.handshake.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
          socket.handshake.address ||
          'unknown';

        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');
        const tokenFingerprint = token ? token.slice(0, 16) : 'no-token';
        const budgetKey = `ip:${ip}|tok:${tokenFingerprint}`;
        const recordFailure = () => {
          const nowMs = Date.now();
          const existing = this.authFailBudget.get(budgetKey);
          if (!existing || existing.resetAtMs <= nowMs) {
            this.authFailBudget.set(budgetKey, { count: 1, resetAtMs: nowMs + this.AUTH_FAIL_WINDOW_MS });
            return;
          }
          existing.count += 1;
        };

        recordFailure();

        // Differentiate error types for better debugging
        if (error instanceof Error) {
          if (error.message === 'Too many authentication attempts') {
            this.loggerService.warn('Socket auth rate limit hit', { socketId: socket.id, ip });
            return next(new Error('Too many attempts - please wait and retry'));
          }
          if (error.message === 'Authentication timeout') {
            this.loggerService.error('Socket authentication timeout:', undefined, `socketId: ${socket.id}`);
            return next(new Error('Authentication timeout - please try again'));
          }
          if (error.message.includes('Token') || error.message.includes('token')) {
            this.loggerService.warn('Socket token error:', { socketId: socket.id, error: error.message });
            return next(new Error('Invalid or expired token'));
          }
          if (error.message.includes('User') || error.message.includes('user')) {
            this.loggerService.warn('Socket user error:', { socketId: socket.id, error: error.message });
            return next(new Error('User authentication failed'));
          }
        }

        this.loggerService.warn('Socket authentication failed:', {
          socketId: socket.id,
          origin: socket.handshake.headers.origin,
          error,
        });
        next(new Error('Authentication failed'));
      }
    });
  }

  handleConnection(@ConnectedSocket() socket: AuthenticatedSocket): void {
    const userId = socket.user?._id?.toString();
    this.activeConnections += 1;
    this.totalConnections += 1;
    this.loggerService.log('socket_connected', {
      event: 'socket_connected',
      socketId: socket.id,
      userId,
      role: socket.user?.role,
      activeConnections: this.activeConnections,
      totalConnections: this.totalConnections,
      totalDisconnects: this.totalDisconnects,
      totalAuthSuccess: this.totalAuthSuccess,
      totalAuthFailure: this.totalAuthFailure,
    });

    // Join user-specific room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join role-specific room
    if (socket.user?.role) {
      socket.join(`role:${socket.user.role}`);
    }
  }

  handleDisconnect(@ConnectedSocket() socket: AuthenticatedSocket): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    this.totalDisconnects += 1;
    this.loggerService.log('socket_disconnected', {
      event: 'socket_disconnected',
      socketId: socket.id,
      userId: socket.user?._id?.toString(),
      role: socket.user?.role,
      activeConnections: this.activeConnections,
      totalConnections: this.totalConnections,
      totalDisconnects: this.totalDisconnects,
    });
  }

  /**
   * Emit event to a specific user
   */
  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit event to all users with a specific role
   */
  emitToRole(role: string, event: string, data: unknown): void {
    this.server.to(`role:${role}`).emit(event, data);
  }

  /**
   * Emit event to all connected clients
   */
  emitToAll(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  /**
   * Run an async operation with a timeout. The timer is cleared when the
   * operation finishes first, preventing unhandled rejections.
   */
  private withTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    ms: number,
    errorMessage: string,
  ): Promise<T> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    let settled = false;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        settled = true;
        controller.abort();
        reject(new Error(errorMessage));
      }, ms);
    });

    const guardedPromise = operation(controller.signal)
      .then((value) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
        }
        return value;
      })
      .catch((error) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          throw error;
        }
        return undefined as unknown as T;
      });

    return Promise.race([guardedPromise, timeoutPromise]);
  }

  /**
   * CORS origin validator bound to this instance.
   */
  private handleCorsOrigin(
    origin: string | undefined,
    callback: (err?: Error, allow?: boolean) => void,
  ): void {
    if (!origin) return callback(undefined, true);

    if (this.allowedOrigins.length === 0) {
      this.loggerService.warn('Socket CORS rejected: no origins configured', {
        origin,
      });
      return callback(new Error('CORS origin not allowed'), false);
    }

    if (this.allowedOrigins.includes(origin)) {
      return callback(undefined, true);
    }

    this.loggerService.warn('Socket CORS rejected: origin not allowed', {
      origin,
    });
    return callback(new Error('CORS origin not allowed'), false);
  }

  /**
   * Get allowed origins for CORS
   */
  private getAllowedOrigins(): string[] {
    const adminPanelUrl = this.configService.get<string>('adminPanelUrl');
    const corsOrigin = this.configService.get<string>('corsOrigin');
    const resolved = resolveAllowedOrigins({
      corsOrigin,
      adminPanelUrl,
      defaultProtocol: 'https',
    });

    // Fail closed when no origins are configured.
    return resolved;
  }
}
