import { messaging, getToken, onMessage } from '../config/firebaseConfig';
import logger from '../utils/logger';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      logger.debug('Notification permission granted');
      return true;
    } else {
      logger.debug('Notification permission denied');
      return false;
    }
  } catch (error) {
    logger.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getFCMToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      logger.debug('FCM Token:', currentToken);
      return currentToken;
    } else {
      logger.debug('No registration token available');
      return null;
    }
  } catch (error) {
    logger.error('Error getting FCM token:', error);
    return null;
  }
};

export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      logger.debug('Message received:', payload);
      resolve(payload);
    });
  });
};

export const setupNotifications = async () => {
  const hasPermission = await requestNotificationPermission();
  if (hasPermission) {
    const token = await getFCMToken();
    return token;
  }
  return null;
};
