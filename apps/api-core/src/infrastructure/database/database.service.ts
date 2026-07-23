import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { configuration } from '../../config/configuration';

/**
 * Database Service
 * 
 * Injectable service for database connection management.
 * Uses NestJS lifecycle hooks for initialization and cleanup.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  private connectionReady = false;
  private connectionPromise: Promise<void> | null = null;
  private lastFailureAt: number | null = null;
  private lastFailureError: string | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
  ) {
    // Seed initial state to avoid false negatives when the connection is already up
    this.connectionReady = this.connection.readyState === 1;

    // Set up connection event listeners for better diagnostics
    this.connection.on('connected', () => {
      this.logger.log('MongoDB connection event: connected');
      this.connectionReady = true;
    });

    this.connection.on('error', (error) => {
      this.logger.error('MongoDB connection event: error', error);
      this.connectionReady = false;
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('[DatabaseService] MongoDB connection event: disconnected');
      this.logger.warn(`[DatabaseService] Connection details: host=${this.connection.host}, port=${this.connection.port}, name=${this.connection.name}`);
      this.connectionReady = false;
      // Reset connection promise to allow reconnection
      this.connectionPromise = null;
      this.lastFailureAt = Date.now();
      this.lastFailureError = 'MongoDB disconnected';
    });

    this.connection.on('reconnected', () => {
      this.logger.log('MongoDB connection event: reconnected');
      this.connectionReady = true;
    });
  }

  private getConfigValue<T>(key: string): T | undefined {
    return (this.configService?.get<T>(key) ?? configuration()[key as keyof ReturnType<typeof configuration>]) as T | undefined;
  }

  private getPingTimeoutMs(): number {
    return this.getConfigValue<number>('dbPingTimeoutMs') ?? 5000;
  }

  private getReadyTimeoutMs(isLocalMongo: boolean, nodeEnv: string): number {
    const configured = this.getConfigValue<number>('dbReadyTimeoutMs');
    if (configured) return configured;
    return isLocalMongo && nodeEnv !== 'production' ? 3000 : 60000;
  }

  private getCooldownMs(isLocalMongo: boolean, nodeEnv: string): number {
    const configured = this.getConfigValue<number>('dbCooldownMs');
    if (configured) return configured;
    return isLocalMongo && nodeEnv !== 'production' ? 3000 : 15000;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        settled = true;
        reject(new Error(errorMessage));
      }, ms);
    });

    const guardedPromise = promise
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

  private async verifyPingOrThrow(context: string): Promise<void> {
    const timeoutMs = this.getPingTimeoutMs();
    const pingPromise = Promise.resolve(this.connection.db?.admin().ping());

    try {
      await this.withTimeout(pingPromise, timeoutMs, 'Ping timeout');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`${context}: ping_failed (${errorMsg})`);
    }
  }

  async onModuleInit(): Promise<void> {
    // Store the connection promise to prevent multiple simultaneous waits
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.waitForConnection();
    return this.connectionPromise;
  }

  private async waitForConnection(): Promise<void> {
    // Wait for MongoDB connection to be ready before allowing operations
    // This prevents "buffering timed out" errors
    const nodeEnv = this.getConfigValue<string>('nodeEnv') || 'development';
    const isLocalMongo = this.connection.host === 'localhost' || this.connection.host === '127.0.0.1';
    // In development with local Mongo, fail fast so API calls don't hang for 60 seconds.
    const maxWaitTime = this.getReadyTimeoutMs(isLocalMongo, nodeEnv);
    const checkInterval = 100; // Check every 100ms
    const startTime = Date.now();
    
    const readyStateText = (state: number) => {
      return ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown';
    };
    
    this.logger.log(`[DatabaseService] Waiting for MongoDB connection. Initial readyState: ${this.connection.readyState} (${readyStateText(this.connection.readyState)})`);
    this.logger.log(`[DatabaseService] Connection details: host=${this.connection.host}, port=${this.connection.port}, name=${this.connection.name}`);
    
    // If already connected, verify and return
    if (this.connection.readyState === 1) {
      try {
        await this.verifyPingOrThrow('waitForConnection');
        this.connectionReady = true;
        this.logger.log('[DatabaseService] Database connection already established and verified');
        return;
      } catch (_error) {
        this.logger.warn('[DatabaseService] Connection appeared ready but ping failed, waiting for proper connection...');
      }
    }
    
    // Wait for connection using Promise with event listeners
    const connectionPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const state = this.connection.readyState;
        this.logger.error(`[DatabaseService] Database connection timeout after ${maxWaitTime}ms. ReadyState: ${state} (${readyStateText(state)})`);
        this.logger.error(`[DatabaseService] Connection details: host=${this.connection.host}, port=${this.connection.port}, name=${this.connection.name}`);
        reject(new Error(`Database connection timeout - MongoDB connection not established. ReadyState: ${readyStateText(state)}`));
      }, maxWaitTime);

      // Fallback poller for a common race: the 'connected' event can fire before
      // we attach listeners, leaving us waiting until timeout even though readyState=1.
      const readyStatePoller = setInterval(() => {
        if (this.connection.readyState === 1) {
          clearInterval(readyStatePoller);
          onConnected();
        }
      }, checkInterval);

      const onConnected = async () => {
        clearInterval(readyStatePoller);
        clearTimeout(timeout);
        this.connection.removeListener('connected', onConnected);
        this.connection.removeListener('error', onError);
        
        // Verify with ping
        try {
          await this.verifyPingOrThrow('waitForConnection');
          this.connectionReady = true;
          const elapsed = Date.now() - startTime;
          this.logger.log(`[DatabaseService] MongoDB connection ready after ${elapsed}ms and verified with ping`);
          resolve();
        } catch (pingError) {
          this.logger.error('[DatabaseService] Connection established but ping failed:', pingError);
          reject(new Error('Database connection ping failed'));
        }
      };

      const onError = (error: Error) => {
        clearInterval(readyStatePoller);
        clearTimeout(timeout);
        this.connection.removeListener('connected', onConnected);
        this.connection.removeListener('error', onError);
        this.logger.error('[DatabaseService] Database connection error:', error);
        reject(error);
      };

      // If already connecting, wait for event
      if (this.connection.readyState === 2) {
        this.connection.once('connected', onConnected);
        this.connection.once('error', onError);
      } else if (this.connection.readyState === 1) {
        // Already connected, verify immediately
        clearTimeout(timeout);
        onConnected();
      } else {
        // Not connecting yet, set up listeners (Mongoose should auto-connect)
        // Also log that we're waiting for Mongoose to start connecting
        this.logger.log(`[DatabaseService] Mongoose readyState is ${this.connection.readyState}, setting up event listeners. Mongoose should auto-connect.`);
        this.connection.once('connected', onConnected);
        this.connection.once('error', onError);
        
        // If Mongoose hasn't started connecting after 1 second, log a warning
        setTimeout(() => {
          if (this.connection.readyState === 0) {
            this.logger.warn(`[DatabaseService] Mongoose still disconnected after 1 second. ReadyState: ${this.connection.readyState}. This may indicate a connection configuration issue.`);
          }
        }, 1000);
      }
    });

    // Also poll for progress logging
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentState = this.connection.readyState;
      const stateText = readyStateText(currentState);
      this.logger.log(`[DatabaseService] Waiting for MongoDB connection... (${elapsed}ms elapsed, readyState: ${currentState} - ${stateText})`);
    }, 5000);

    try {
      await connectionPromise;
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
      this.lastFailureAt = Date.now();
      this.lastFailureError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Ensure connection is ready before operations
   * This can be called by services to verify connection before running queries
   */
  async ensureConnectionReady(): Promise<void> {
    const readyStateText = (state: number) => {
      return ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown';
    };

    const nodeEnv = this.getConfigValue<string>('nodeEnv') || 'development';
    const isLocalMongo = this.connection.host === 'localhost' || this.connection.host === '127.0.0.1';
    const cooldownMs = this.getCooldownMs(isLocalMongo, nodeEnv);

    // Always log when this is called for debugging
    const currentState = this.connection.readyState;
    this.logger.log(`[DatabaseService] ensureConnectionReady called. Current state: ${currentState} (${readyStateText(currentState)}), connectionReady: ${this.connectionReady}`);

    // If Mongoose reports connected, treat as ready and verify with ping.
    // This avoids false timeouts when the 'connected' event was missed.
    if (currentState === 1) {
      try {
        await this.verifyPingOrThrow('ensureConnectionReady');
        this.connectionReady = true;
        this.logger.log('[DatabaseService] Connection verified with ping');
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[DatabaseService] readyState=connected but ping failed (${errorMsg}), reconnecting...`);
        this.connectionReady = false;
        this.connectionPromise = null;
      }
    }

    // Circuit breaker: if we recently failed to connect, fail fast to avoid 60s request hangs.
    if (!this.connectionReady && currentState === 0 && this.lastFailureAt) {
      const sinceFailure = Date.now() - this.lastFailureAt;
      if (sinceFailure < cooldownMs) {
        const lastErr = this.lastFailureError ? ` Last error: ${this.lastFailureError}` : '';
        throw new Error(`Database connection not ready (cooldown ${cooldownMs}ms, ${sinceFailure}ms since last failure).${lastErr}`);
      }
    }

    // Quick check: if already ready, verify with ping
    if (this.connectionReady && this.connection.readyState === 1) {
      try {
        await this.verifyPingOrThrow('ensureConnectionReady');
        this.logger.log('[DatabaseService] Connection verified with ping');
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[DatabaseService] Connection appeared ready but ping failed (${errorMsg}), reconnecting...`);
        this.connectionReady = false;
        // Reset connection promise to allow reconnection
        this.connectionPromise = null;
      }
    }

    // If connection promise exists, wait for it
    if (this.connectionPromise) {
      try {
        this.logger.log('[DatabaseService] Waiting for existing connection promise...');
        await this.connectionPromise;
        // Verify connection after waiting
        if (this.connection.readyState !== 1) {
          throw new Error(`Connection not ready after wait. State: ${this.connection.readyState} (${readyStateText(this.connection.readyState)})`);
        }
        await this.verifyPingOrThrow('ensureConnectionReady');
        this.connectionReady = true;
        this.logger.log('[DatabaseService] Connection ready after waiting for promise');
        return;
      } catch (error) {
        this.logger.error('[DatabaseService] Connection promise failed, retrying...', error);
        // Reset promise to allow retry
        this.connectionPromise = null;
        this.connectionReady = false;
      }
    }

    // Otherwise, wait for connection
    try {
      this.logger.log('[DatabaseService] Starting new connection wait...');
      await this.waitForConnection();
      // Final verification
      if (this.connection.readyState !== 1) {
        throw new Error(`Connection not ready after waitForConnection. State: ${this.connection.readyState} (${readyStateText(this.connection.readyState)})`);
      }
      await this.verifyPingOrThrow('ensureConnectionReady');
      this.connectionReady = true;
      this.logger.log('[DatabaseService] Connection ready after waitForConnection');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[DatabaseService] Failed to ensure connection ready: ${errorMsg}`);
      this.logger.error(`[DatabaseService] Connection details: host=${this.connection.host}, port=${this.connection.port}, name=${this.connection.name}, readyState=${this.connection.readyState} (${readyStateText(this.connection.readyState)})`);
      throw new Error(`Database connection not ready: ${errorMsg}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.connection.close();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error('Error closing database connection:', error);
    }
  }

  /**
   * Check database connection health
   * @returns true if database is connected and responsive
   */
  async checkHealth(): Promise<boolean> {
    try {
      if (this.connection.readyState !== 1) {
        return false;
      }
      // Ping the database to verify it's responsive
      await this.connection.db?.admin().ping();
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database connection statistics
   * @returns Connection statistics object
   */
  getConnectionStats() {
    const conn = this.connection;
    return {
      readyState: conn.readyState,
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][conn.readyState] || 'unknown',
      host: conn.host,
      port: conn.port,
      name: conn.name,
      maxPoolSize: 10,
    };
  }

  /**
   * Get the connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get a model from the verified connection
   * This ensures the model uses the same connection instance that was verified
   */
  getModel<T = unknown>(modelName: string): T {
    if (this.connection.readyState !== 1) {
      throw new Error(`Cannot get model ${modelName}: Connection not ready. State: ${this.connection.readyState}`);
    }
    if (this.connection.models[modelName]) {
      return this.connection.models[modelName] as T;
    }
    throw new Error(`Model ${modelName} not found on connection`);
  }
}
