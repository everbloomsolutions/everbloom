#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates required environment variables before build
 */

const requiredVars = {
  production: [
    'VITE_API_BASE_URL',
  ],
  development: [],
};

const mode = process.env.NODE_ENV || 'development';
const vars = requiredVars[mode] || [];

const missing = vars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables for ${mode}:`);
  missing.forEach(v => console.error(`   - ${v}`));
  console.error('');
  console.error('Please set these variables in your deployment platform:');
  console.error('  - Vercel: Project Settings > Environment Variables');
  console.error('  - Docker/Kubernetes: Set in docker-compose.yaml, deployment manifest, or .env file');
  console.error('  - Other platforms: Use the platform dashboard or environment settings');
  process.exit(1);
}

// Check for common misconfigurations
const warnings = [];

if (mode === 'production') {
  const apiBaseUrl = process.env.VITE_API_BASE_URL;
  
  if (apiBaseUrl) {
    // Check if it's a relative URL (won't work in production)
    if (!apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
      warnings.push('VITE_API_BASE_URL appears to be a relative URL. Use full URL in production (e.g., https://backend.example.com/api/v1)');
    }
    
    // Check if it includes /api/v1
    if (!apiBaseUrl.includes('/api/v1')) {
      warnings.push('VITE_API_BASE_URL should include /api/v1 path (e.g., https://backend.example.com/api/v1)');
    }
  }
  
  // Check for VITE_SOCKET_URL (optional but recommended)
  if (!process.env.VITE_SOCKET_URL) {
    warnings.push('VITE_SOCKET_URL is not set. WebSocket connections may not work.');
  }
}

if (warnings.length > 0) {
  console.warn('⚠️  Configuration warnings:');
  warnings.forEach(w => console.warn(`   - ${w}`));
  console.warn('');
}

console.log(`✅ All required environment variables are set for ${mode}`);
if (mode === 'production') {
  console.log(`   VITE_API_BASE_URL: ${process.env.VITE_API_BASE_URL || '(not set)'}`);
  console.log(`   VITE_SOCKET_URL: ${process.env.VITE_SOCKET_URL || '(not set)'}`);
}
