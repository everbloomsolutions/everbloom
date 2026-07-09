import logger from '../utils/logger';

const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_SOCKET_URL',
];

const optionalEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
];

export const validateEnv = () => {
  const missing = [];

  requiredEnvVars.forEach((varName) => {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const missingOptional = [];
  optionalEnvVars.forEach((varName) => {
    if (!import.meta.env[varName]) {
      missingOptional.push(varName);
    }
  });

  if (missingOptional.length > 0) {
    logger.warn('Missing optional environment variables:', missingOptional);
  }

  return true;
};

export default validateEnv;
