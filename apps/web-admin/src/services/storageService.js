import logger from '../utils/logger';

class StorageService {
  set(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error saving to localStorage:', error);
      return false;
    }
  }

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      logger.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error('Error removing from localStorage:', error);
      return false;
    }
  }

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing localStorage:', error);
      return false;
    }
  }

  has(key) {
    return localStorage.getItem(key) !== null;
  }

  keys() {
    return Object.keys(localStorage);
  }
}

export default new StorageService();
