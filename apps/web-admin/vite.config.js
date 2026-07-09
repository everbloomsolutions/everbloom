// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import Terminal from 'vite-plugin-terminal';

export default defineConfig(({ mode }) => {
  // Load env from current directory (admin-panel)
  // Vite automatically loads .env files from process.cwd()
  // Priority: .env.production.local > .env.local > .env.production > .env
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      /**
       * Terminal Plugin Configuration
       *
       * The Terminal plugin can cause "Failed to fetch" errors when trying to send logs.
       * Configure it to only output to console to avoid network errors.
       */
      ...(mode === 'development' && process.env.VITE_ENABLE_TERMINAL_PLUGIN !== 'false' ? [
        Terminal({
          console: 'terminal',
          output: ['console'], // Only output to console, don't try to send logs to backend
          silent: true, // Set to true to reduce memory usage
        })
      ] : [])
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    define: {
      // Only define VITE_ prefixed environment variables for security
      ...Object.keys(env).reduce((acc, key) => {
        if (key.startsWith('VITE_')) {
          acc[`import.meta.env.${key}`] = JSON.stringify(env[key]);
        }
        return acc;
      }, {}),
      // Ensure API URL is available in production
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || (mode === 'production' ? '' : '/api')
      )
    },

    server: {
      /**
       * Development Server Configuration
       * Port: 3001 (admin) - distinct from backend 8080 and frontend 3000. Override: VITE_DEV_PORT.
       */
      port: parseInt(process.env.VITE_DEV_PORT || '3001', 10),
      host: '0.0.0.0',
      strictPort: false,
      allowedHosts: true,
      watch: {
        // Ignore pnpm store and other directories that can cause symlink issues
        ignored: ['**/.pnpm-store/**', '**/node_modules/**', '**/.git/**', '**/dist/**']
      },
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: parseInt(process.env.VITE_DEV_PORT || '3001', 10),
      },
      proxy: {
        '/api': {
          /**
           * API Proxy Configuration
           *
           * Port Resolution Priority:
           * 1. VITE_BACKEND_URL (full URL, highest priority)
           * 2. VITE_BACKEND_HOST + VITE_BACKEND_PORT (constructed URL)
           * 3. Default: http://localhost:8080
           *
           * Note: This proxy is only used in development.
           * In production, VITE_API_BASE_URL is used directly.
           */
          target: (() => {
            // Priority 1: Full URL from VITE_BACKEND_URL
            if (env.VITE_BACKEND_URL) {
              const target = env.VITE_BACKEND_URL;
              console.log(`[Vite Proxy] Using VITE_BACKEND_URL: ${target}`);
              return target;
            }

            // Priority 2: Construct from host and port
            const backendHost = env.VITE_BACKEND_HOST || 'localhost';
            const backendPort = env.VITE_BACKEND_PORT || '8080';
            const target = `http://${backendHost}:${backendPort}`;

            // Log configuration for debugging
            console.log(`[Vite Proxy] Backend target: ${target}`);
            console.log(`[Vite Proxy] Resolved from: HOST=${backendHost}, PORT=${backendPort}`);

            return target;
          })(),
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket proxying
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('[Vite Proxy] Connection error:', err.message);
              console.error('[Vite Proxy] Make sure backend is running on the configured port');
              console.error('[Vite Proxy] Check VITE_BACKEND_URL or VITE_BACKEND_PORT environment variables');
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`[Vite Proxy] ${req.method} ${req.url} -> ${proxyReq.path}`);
            });
          }
        }
        ,
        '/api/v1': {
          target: (() => {
            if (env.VITE_BACKEND_URL) {
              const target = env.VITE_BACKEND_URL;
              console.log(`[Vite Proxy] Using VITE_BACKEND_URL: ${target}`);
              return target;
            }

            const backendHost = env.VITE_BACKEND_HOST || 'localhost';
            const backendPort = env.VITE_BACKEND_PORT || '8080';
            const target = `http://${backendHost}:${backendPort}`;

            console.log(`[Vite Proxy] Backend target: ${target}`);
            console.log(`[Vite Proxy] Resolved from: HOST=${backendHost}, PORT=${backendPort}`);

            return target;
          })(),
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('[Vite Proxy] Connection error:', err.message);
              console.error('[Vite Proxy] Make sure backend is running on the configured port');
              console.error('[Vite Proxy] Check VITE_BACKEND_URL or VITE_BACKEND_PORT environment variables');
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`[Vite Proxy] ${req.method} ${req.url} -> ${proxyReq.path}`);
            });
          }
        }
      }
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      cssCodeSplit: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'react-vendor';
              if (id.includes('axios')) return 'axios';
              if (id.includes('socket.io')) return 'socket';
              return 'vendor';
            }
          }
        }
      }
    },

    preview: {
      port: 3002,
      host: '0.0.0.0',
      strictPort: true
    }
  };
});
