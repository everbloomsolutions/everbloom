import { useEffect, useRef } from 'react';
import { tokenManager } from '../../utils/tokenManager';
import logger from '../../utils/logger';
import { toast } from 'react-hot-toast';

const DEFAULT_BUFFER_MS = 60_000; // 1 minute before expiry
const CHECK_INTERVAL_MS = 60_000; // Check every minute

/**
 * Automatically log the user out when the access token is about to expire.
 *
 * @param {() => void} logout - Logout callback from AuthContext.
 * @param {boolean} isAuthenticated - Whether the user is currently authenticated.
 * @param {number} [bufferMs=60000] - How long before expiry to trigger logout.
 */
export const useSessionTimeout = (logout, isAuthenticated, bufferMs = DEFAULT_BUFFER_MS) => {
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkExpiry = () => {
      const expiry = tokenManager.getTokenExpiry();
      if (!expiry) return;

      const timeUntilExpiry = expiry - Date.now();
      if (timeUntilExpiry <= bufferMs) {
        toast.error('Your session has expired. Please log in again.');
        logoutRef.current?.();
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, CHECK_INTERVAL_MS);

    logger.debug('Session timeout polling started');

    return () => clearInterval(interval);
  }, [isAuthenticated, bufferMs]);
};

export default useSessionTimeout;
