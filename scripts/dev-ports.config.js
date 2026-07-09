/**
 * Single source of truth for dev server ports.
 * Used by root scripts/kill-dev-ports.js and documentation.
 * Prevents EADDRINUSE: each service has a distinct port. Compatible with Railway (PORT), Vercel (serverless), AWS.
 *
 * Service       | Port  | Env (override)
 * Backend API   | 8080  | PORT (Railway/AWS) or BACKEND_PORT (dev)
 * Admin Panel   | 3001  | VITE_DEV_PORT (dev)
 * Frontend Web  | 3000  | PORT / VITE_DEV_PORT (when implemented)
 */
module.exports = {
  apiCore: 8080,
  webAdmin: 3001,
  webPublic: 3000,
};
