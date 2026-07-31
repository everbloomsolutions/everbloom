import { io } from 'socket.io-client';
import { appConfig } from '../config/appConfig';
import logger from '../utils/logger';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionListeners = new Set();
    this.connectingPromise = null;
    this.lastConnectError = null;
  }

  _notifyConnectionState() {
    const state = {
      connected: this.isConnected(),
      lastConnectError: this.lastConnectError,
    };
    this.connectionListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        logger.error('Socket connection listener error:', err);
      }
    });
  }

  subscribeConnectionState(callback) {
    this.connectionListeners.add(callback);
    callback({
      connected: this.isConnected(),
      lastConnectError: this.lastConnectError,
    });
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return;
    }

    if (this.connectingPromise) {
      return;
    }

    this.lastConnectError = null;

    // Create socket but do not auto-connect. This avoids React 18 StrictMode noise
    // and prevents premature connections before auth is ready.
    // The auth cookie is sent automatically because withCredentials is enabled.
    this.socket = io(appConfig.socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: false,
    });

    this.socket.on('connect', () => {
      logger.debug('Socket connected:', this.socket.id);
      this.lastConnectError = null;
      this._notifyConnectionState();
    });

    this.socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected:', reason);
      this._notifyConnectionState();
    });

    this.socket.on('error', (error) => {
      logger.error('Socket error:', error);
      this.lastConnectError = error;
      this._notifyConnectionState();
    });

    this.socket.on('connect_error', (error) => {
      // Socket.IO emits connect_error when handshake middleware rejects
      this.lastConnectError = error;
      logger.error('Socket connect_error:', {
        message: error?.message,
        description: error?.description,
        context: error?.context,
      });
      this._notifyConnectionState();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      logger.debug('Socket reconnected after', attemptNumber, 'attempts');
      this._notifyConnectionState();
    });

    this.connectingPromise = Promise.resolve().then(() => {
      this.socket.connect();
    }).finally(() => {
      this.connectingPromise = null;
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      this.currentToken = null;
      this.lastConnectError = null;
      this._notifyConnectionState();
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      logger.warn('Socket not connected');
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

export default new SocketService();
