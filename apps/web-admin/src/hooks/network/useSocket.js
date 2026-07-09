import { useEffect, useState } from 'react';
import socketService from '../../services/socketService';
import logger from '../../utils/logger';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState(null);

  useEffect(() => {
    setSocket(socketService.socket || null);

    const unsubscribe = socketService.subscribeConnectionState((state) => {
      setSocket(socketService.socket || null);
      setConnected(!!state.connected);
      setConnectError(state.lastConnectError || null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  return {
    socket,
    connected,
    connectError,
    emit,
    on,
    off,
  };
};

export default useSocket;
