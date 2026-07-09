import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('Generating build report...');

try {
  execSync('pnpm turbo build', { stdio: 'inherit' });

  const report = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    nodeVersion: process.version,
    buildSuccess: true,
  };

  writeFileSync('build-report.json', JSON.stringify(report, null, 2));
  console.log('Build report generated successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
