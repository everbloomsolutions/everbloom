import logger from '../utils/logger';

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      logger.debug('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      logger.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const unregistered = await registration.unregister();
    logger.debug('Service Worker unregistered:', unregistered);
    return unregistered;
  }
  return false;
};

export const checkForUpdates = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    logger.debug('Checked for Service Worker updates');
  }
};

export const isInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
};

export const canInstall = () => {
  return 'BeforeInstallPromptEvent' in window;
};
