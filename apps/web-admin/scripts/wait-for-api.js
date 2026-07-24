#!/usr/bin/env node

/**
 * Wait for the backend API health endpoint to be ready before starting Vite.
 * This prevents the Vite proxy from spamming ECONNREFUSED errors while
 * api-core is still booting.
 *
 * Usage: node scripts/wait-for-api.js
 */

import http from 'node:http';

const host = process.env.VITE_BACKEND_HOST || 'localhost';
const port = process.env.VITE_BACKEND_PORT || 8080;
const timeoutMs = parseInt(process.env.WAIT_FOR_API_TIMEOUT_MS || '60000', 10);
const intervalMs = parseInt(process.env.WAIT_FOR_API_INTERVAL_MS || '500', 10);

const healthUrl = `http://${host}:${port}/health/ready`;

function checkReady() {
  return new Promise((resolve, reject) => {
    const req = http.get(healthUrl, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(true);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.resume();
    });

    req.on('error', reject);
    req.setTimeout(intervalMs, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function waitForApi() {
  const start = Date.now();

  while (true) {
    try {
      await checkReady();
      console.log(`[wait-for-api] API is ready at ${healthUrl}`);
      return;
    } catch {
      if (Date.now() - start >= timeoutMs) {
        console.error(`[wait-for-api] Timed out waiting for ${healthUrl}`);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

waitForApi();
