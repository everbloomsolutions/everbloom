#!/usr/bin/env node

/**
 * Kill processes on dev server ports before starting dev.
 * Reads ports from scripts/dev-ports.config.js (single source of truth).
 * Run from repo root only: pnpm dev runs this first, then turbo run dev.
 */

const path = require('path');
const { killPortProcess } = require('kill-port');

const configPath = path.resolve(__dirname, 'dev-ports.config.js');
const ports = require(configPath);

const portList = [
  { name: 'api-core', port: ports.apiCore },
  { name: 'web-admin', port: ports.webAdmin },
  { name: 'web-public', port: ports.webPublic },
];

async function killDevPorts() {
  console.log('Cleaning up dev server ports...\n');

  for (const { name, port } of portList) {
    try {
      await killPortProcess(port);
      console.log(`  Killed process on port ${port} (${name})`);
    } catch {
      console.log(`  Port ${port} (${name}) was free`);
    }
  }

  console.log('\nPorts cleared. Starting dev servers...\n');
}

killDevPorts().catch((err) => {
  console.error('Error cleaning ports:', err);
  process.exit(1);
});
