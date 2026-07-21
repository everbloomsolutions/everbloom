#!/usr/bin/env node

/**
 * Kill processes running on backend dev server port before starting dev server
 * Port: 8080 (backend default)
 *
 * Port Configuration:
 * - Backend: 8080 (default) or PORT env var (container platforms)
 */

const { killPortProcess } = require('kill-port');

// Port to clean: backend (8080)
const PORT = 8080;

async function killDevPorts() {
  console.log('🧹 Cleaning up dev server port...\n');

  try {
    await killPortProcess(PORT);
    console.log(`  ✓ Killed process on port ${PORT}`);
    console.log(`\n✅ Cleaned port: ${PORT}`);
  } catch (error) {
    // Port might not be in use, which is fine
    console.log(`\n✅ No process found on port ${PORT}`);
  }

  console.log('\n🚀 Starting dev server...\n');
}

killDevPorts().catch((error) => {
  console.error('❌ Error cleaning port:', error);
  process.exit(1);
});
