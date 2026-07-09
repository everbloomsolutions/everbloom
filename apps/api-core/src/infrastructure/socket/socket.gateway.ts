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
    origin: (origin, callback) => {
      // Allow same-origin / non-browser clients
      if (!origin) return callback(null, true);

      // Use explicit origins when configured; otherwise allow all.
      // This prevents silent websocket handshake drops due to browser CORS.
      const allowedOrigins = (globalThis as any).__socketAllowedOrigins as string[] | true | undefined;
      if (allowedOrigins === true || !allowedOrigins) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  // Proxy-friendly defaults (Railway, Nginx, etc.)
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
    // Cache allowed origins for the CORS callback above
    const allowedOrigins = this.getAllowedOrigins();
    (globalThis as any).__socketAllowedOrigins = allowedOrigins;

    this.loggerService.log('Socket.io server initialized', {
      allowedOrigins: formatAllowedOriginsForLog(allowedOrigins),
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

        // Create timeout promise for database operations
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Authentication timeout'));
          }, AUTH_TIMEOUT_MS);
        });

        // Race between authentication and timeout
        await Promise.race([
          (async () => {
            // Check if token is blacklisted
            const nowMs = Date.now();
            const cached = this.blacklistCache.get(token);
            let isBlacklisted: boolean;
            const blacklistStartMs = Date.now();
            if (cached && cached.expiresAtMs > nowMs) {
              isBlacklisted = cached.value;
            } else {
              isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
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
          })(),
          timeoutPromise,
        ]);

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
   * Get allowed origins for CORS
   */
  private getAllowedOrigins(): string[] | true {
    const adminPanelUrl = this.configService.get<string>('adminPanelUrl');
    const corsOrigin = this.configService.get<string>('corsOrigin');
    const resolved = resolveAllowedOrigins({
      corsOrigin,
      adminPanelUrl,
      defaultProtocol: 'https',
    });

    // If nothing is configured, allow all origins (safer default for avoiding silent drops)
    return resolved.length > 0 ? resolved : true;
  }
}
